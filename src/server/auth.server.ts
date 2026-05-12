import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCookie,
  setCookie,
  deleteCookie,
  getRequest,
} from "@tanstack/react-start/server";
import { db } from "./db.server";
import { users } from "./schema.server";
import { eq } from "drizzle-orm";
import { rateLimit } from "./redis";
import { env } from "../lib/env";

function sessionCookieName(): string {
  return import.meta.env.PROD ? "__Secure-devbrand_sid" : "devbrand_sid";
}

function cookieSecure(): boolean {
  return import.meta.env.PROD;
}

const STATE_COOKIE_NAME = "devbrand_oauth_state";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const SESSION_ROTATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Helpers ──────────────────────────────────────────────────────────────────

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function sha256Base64Url(text: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function getKey(): Promise<CryptoKey> {
  const secret = env.SESSION_SECRET;
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
async function signState(state: string): Promise<string> {
  const key = await getKey();
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(state));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${state}.${sigB64}`;
}

async function verifyState(signedState: string): Promise<string | null> {
  const parts = signedState.split(".");
  if (parts.length !== 2) return null;
  const [state, sigB64] = parts;
  const key = await getKey();
  const enc = new TextEncoder();
  
  const normalizedSig = sigB64.replace(/-/g, "+").replace(/_/g, "/");
  const sig = Uint8Array.from(atob(normalizedSig), (c) => c.charCodeAt(0));
  
  const valid = await crypto.subtle.verify("HMAC", key, sig, enc.encode(state));
  return valid ? state : null;
}

function getOAuthRedirectUri(): string {
  const base = env.APP_URL.replace(/\/+$/, "");
  return `${base}/api/auth/callback/github`;
}

async function signSession(
  userId: string,
  sessionNonce: string,
  options?: { rotate?: boolean },
): Promise<string> {
  const key = await getKey();
  const enc = new TextEncoder();
  const ts = Date.now().toString(36);
  const nonce = options?.rotate ? crypto.randomUUID().slice(0, 8) : "";
  const payload = nonce
    ? `${userId}.${ts}.${sessionNonce}.${nonce}`
    : `${userId}.${ts}.${sessionNonce}`;
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${payload}.${sigB64}`;
}

async function verifySession(
  cookie: string,
): Promise<{ userId: string; issuedAt: number; sessionNonce: string } | null> {
  try {
    const parts = cookie.split(".");
    if (parts.length < 3) return null;

    const sigB64 = parts[parts.length - 1];
    const payloadParts = parts.slice(0, parts.length - 1);
    const payload = payloadParts.join(".");

    const key = await getKey();
    const enc = new TextEncoder();

    const normalizedSig = sigB64.replace(/-/g, "+").replace(/_/g, "/");
    const sig = Uint8Array.from(atob(normalizedSig), (c) => c.charCodeAt(0));

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sig,
      enc.encode(payload),
    );
    if (!valid) return null;

    if (parts.length === 3) {
      const [userId, ts] = parts;
      return { userId, issuedAt: parseInt(ts, 36), sessionNonce: "" };
    }

    const [userId, ts, sessionNonce] = parts;
    const issuedAt = parseInt(ts, 36);
    if (isNaN(issuedAt) || Date.now() - issuedAt > SESSION_TTL_MS) return null;

    return { userId, issuedAt, sessionNonce };
  } catch {
    return null;
  }
}

/**
 * Core session resolution (cookies + DB + rotation). Safe to call from other server modules.
 */
export async function loadSessionUser() {
  const raw = getCookie(sessionCookieName());
  if (!raw) return null;

  const session = await verifySession(raw);
  if (!session) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    with: { profile: true },
  });

  if (!user) return null;

  if (session.sessionNonce && session.sessionNonce !== user.sessionNonce) {
    const request = getRequest();
    const ip =
      request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const { logSecurityEvent } = await import("./redis");
    await logSecurityEvent("session_mismatch", user.id, ip, {
      reason: "invalid_nonce",
    });
    deleteCookie(sessionCookieName(), { path: "/" });
    return null;
  }

  const shouldRotate =
    Date.now() - session.issuedAt > SESSION_ROTATION_INTERVAL_MS;
  if (shouldRotate) {
    const newSigned = await signSession(session.userId, user.sessionNonce, {
      rotate: true,
    });
    setCookie(sessionCookieName(), newSigned, {
      httpOnly: true,
      secure: cookieSecure(),
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return user;
}

/**
 * Higher-order guard for admin-only server functions.
 */
export async function ensureAdmin() {
  const user = await loadSessionUser();
  if (!user || user.role !== "admin") {
    throw new Error("ADMIN_REQUIRED");
  }
  return user;
}

/**
 * GitHub redirects with GET ?code=&state= — use this from the HTTP callback route.
 */
export async function completeGithubOAuth(data: {
  code: string;
  state?: string;
}) {
  const { code, state } = data;
  const request = getRequest();
  const ip =
    request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

  const { success } = await rateLimit(`auth:callback:${ip}`, 10, 3600);
  if (!success) throw new Error("AUTH_RATE_LIMIT_REACHED");

  const savedStateRaw = getCookie(STATE_COOKIE_NAME);
  const codeVerifier = getCookie("devbrand_pkce_verifier");

  deleteCookie(STATE_COOKIE_NAME, { path: "/" });
  deleteCookie("devbrand_pkce_verifier", { path: "/" });

  if (!state || !savedStateRaw || !codeVerifier) {
    throw new Error("Invalid OAuth session. Please try again.");
  }

  let stateData: { value: string; createdAt: number };
  try {
    stateData = JSON.parse(savedStateRaw);
  } catch {
    throw new Error("Invalid state format.");
  }

  const verifiedState = await verifyState(stateData.value);
  if (!verifiedState || !timingSafeEqual(state, verifiedState)) {
    throw new Error("Invalid OAuth state signature.");
  }

  if (Date.now() - stateData.createdAt > 10 * 60 * 1000) {
    throw new Error("OAuth session expired.");
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      code_verifier: codeVerifier,
      redirect_uri: getOAuthRedirectUri(),
    }),
  });
  const { access_token, error } = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!access_token) {
    throw new Error(`GitHub OAuth failed: ${error}`);
  }

  const ghRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${access_token}`,
      "User-Agent": "DevBrand/1.0",
    },
  });
  const ghUser = (await ghRes.json()) as {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string;
    email: string | null;
  };

  const [user] = await db
    .insert(users)
    .values({
      githubId: ghUser.id.toString(),
      githubLogin: ghUser.login,
      name: ghUser.name ?? ghUser.login,
      avatarUrl: ghUser.avatar_url,
      email: ghUser.email,
      referralCode: `${ghUser.login}-${Math.random().toString(36).substring(2, 8)}`,
    })
    .onConflictDoUpdate({
      target: users.githubId,
      set: {
        githubLogin: ghUser.login,
        name: ghUser.name ?? ghUser.login,
        avatarUrl: ghUser.avatar_url,
        email: ghUser.email,
        updatedAt: new Date(),
      },
    })
    .returning();

  const signed = await signSession(user.id, user.sessionNonce);
  setCookie(sessionCookieName(), signed, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return user;
}

// ── Plain Functions (Server-Only) ─────────────────────────────────────────────

export async function getSessionFn() {
  return loadSessionUser();
}

export async function logoutFn() {
  deleteCookie(sessionCookieName(), { path: "/" });
  return { success: true };
}

export async function logoutAllDevicesFn() {
  const raw = getCookie(sessionCookieName());
  deleteCookie(sessionCookieName(), { path: "/" });
  if (!raw) return { success: true };
  const verified = await verifySession(raw);
  if (!verified) return { success: true };
  await db
    .update(users)
    .set({ sessionNonce: crypto.randomUUID(), updatedAt: new Date() })
    .where(eq(users.id, verified.userId));
  return { success: true };
}

export async function getSecurityEventsFn() {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (user.plan !== "pro") throw new Error("PRO_REQUIRED");
  const { readSecurityEvents } = await import("./redis");
  const rows = await readSecurityEvents(100);
  return rows.map((r) => ({
    type: r.type,
    ip: r.ip,
    timestamp: r.timestamp.toISOString(),
    details: r.details,
  }));
}

const settingsSchema = z.object({
  seniority: z.enum(["junior", "mid", "senior", "staff"]),
  tone: z.enum(["direct", "storytelling", "technical"]),
  targetAudience: z.enum(["recruiter", "manager", "peer", "founder"]),
});

export async function updateUserSettingsFn(data: z.infer<typeof settingsSchema>) {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  await db
    .update(users)
    .set({
      seniority: data.seniority,
      tone: data.tone,
      targetAudience: data.targetAudience,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  return { success: true };
}

export async function signInWithGithubFn() {
  const request = getRequest();
  const ip =
    request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = request?.headers.get("user-agent") || "unknown";

  const { success, remaining, resetAt } = await rateLimit(
    `auth:signin:${ip}`,
    5,
    3600,
  );
  if (!success) {
    const { logSecurityEvent } = await import("./redis");
    await logSecurityEvent("rate_limit_exceeded", null, ip, {
      action: "signin",
    });
    return { error: "RATE_LIMIT_REACHED", resetAt };
  }

  const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
  const codeChallenge = await sha256Base64Url(codeVerifier);

  const stateBase = crypto.randomUUID();
  const signedState = await signState(stateBase);
  const stateData = {
    value: signedState,
    ip,
    ua: userAgent.slice(0, 100),
    createdAt: Date.now(),
  };

  setCookie(STATE_COOKIE_NAME, JSON.stringify(stateData), {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "strict",
    maxAge: 60 * 10,
    path: "/",
  });

  setCookie("devbrand_pkce_verifier", codeVerifier, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "strict",
    maxAge: 60 * 10,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: getOAuthRedirectUri(),
    scope: "read:user user:email",
    state: stateBase,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return {
    url: `https://github.com/login/oauth/authorize?${params}`,
    remaining,
    resetAt,
  };
}

export async function handleGithubCallbackFn(data: { code: string; state?: string }) {
  return completeGithubOAuth(data);
}
