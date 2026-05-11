import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCookie, setCookie, deleteCookie, getRequest } from "@tanstack/react-start/server";
import { db } from "./db";
import { users, userEvents } from "./schema";
import { eq } from "drizzle-orm";
import { rateLimit } from "./redis";

const SESSION_COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Secure-devbrand_sid" : "devbrand_sid";
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
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 chars. Run: openssl rand -base64 32");
  }
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signSession(userId: string, sessionNonce: string, options?: { rotate?: boolean }): Promise<string> {
  const key = await getKey();
  const enc = new TextEncoder();
  const ts = Date.now().toString(36);
  const nonce = options?.rotate ? crypto.randomUUID().slice(0, 8) : "";
  const payload = nonce ? `${userId}.${ts}.${sessionNonce}.${nonce}` : `${userId}.${ts}.${sessionNonce}`;
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  // URL-safe base64
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${payload}.${sigB64}`;
}

async function verifySession(cookie: string): Promise<{ userId: string; issuedAt: number; sessionNonce: string } | null> {
  try {
    const parts = cookie.split(".");
    if (parts.length < 3) return null;
    
    const sigB64 = parts[parts.length - 1];
    const payloadParts = parts.slice(0, parts.length - 1);
    const payload = payloadParts.join(".");
    
    // Formats: 
    // old: userId.ts.sig (parts.length=3)
    // new: userId.ts.sessionNonce.sig (parts.length=4)
    // new-rotated: userId.ts.sessionNonce.nonce.sig (parts.length=5)
    
    const key = await getKey();
    const enc = new TextEncoder();
    
    // Normalize sigB64 from URL-safe back to standard for atob
    const normalizedSig = sigB64.replace(/-/g, "+").replace(/_/g, "/");
    const sig = Uint8Array.from(atob(normalizedSig), (c) => c.charCodeAt(0));
    
    const valid = await crypto.subtle.verify("HMAC", key, sig, enc.encode(payload));
    if (!valid) return null;

    if (parts.length === 3) {
       // Migration path for old sessions
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

// ── Server functions ─────────────────────────────────────────────────────────

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const raw = getCookie(SESSION_COOKIE_NAME);
  if (!raw) return null;

  const session = await verifySession(raw);
  if (!session) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    with: { profile: true },
  });
  
  if (!user) return null;

  // Verify sessionNonce (unless it's an old session we're migrating)
  if (session.sessionNonce && session.sessionNonce !== user.sessionNonce) {
    const request = getRequest();
    const ip = request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const { logSecurityEvent } = await import("./redis");
    await logSecurityEvent("session_mismatch", user.id, ip, { reason: "invalid_nonce" });
    deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
    return null;
  }

  // Rotation: If session is older than interval, refresh it
  const shouldRotate = Date.now() - session.issuedAt > SESSION_ROTATION_INTERVAL_MS;
  if (shouldRotate) {
    const newSigned = await signSession(session.userId, user.sessionNonce, { rotate: true });
    setCookie(SESSION_COOKIE_NAME, newSigned, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return user;
});

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
  return { success: true };
});

export const logoutAllDevices = createServerFn({ method: "POST" }).handler(async () => {
  const user = await getSession();
  if (!user) throw new Error("UNAUTHORIZED");

  // Invalidate all sessions by changing the nonce
  const newNonce = crypto.randomUUID();
  await db.update(users).set({ sessionNonce: newNonce }).where(eq(users.id, user.id));
  
  deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
  return { success: true };
});

export const signInWithGithub = createServerFn({ method: "GET" }).handler(async () => {
  const request = getRequest();
  const ip = request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  const userAgent = request?.headers.get("user-agent") || "unknown";

  const { success, remaining, resetAt } = await rateLimit(`auth:signin:${ip}`, 5, 3600);
  if (!success) {
    const { logSecurityEvent } = await import("./redis");
    await logSecurityEvent("rate_limit_exceeded", null, ip, { action: "signin" });
    return { error: "RATE_LIMIT_REACHED", resetAt };
  }

  // OAuth PKCE
  const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
  const codeChallenge = await sha256Base64Url(codeVerifier);

  // State with IP/UA binding
  const stateBase = crypto.randomUUID();
  const stateData = {
    value: stateBase,
    ip,
    ua: userAgent.slice(0, 100),
    createdAt: Date.now(),
  };
  
  setCookie(STATE_COOKIE_NAME, JSON.stringify(stateData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 10,
    path: "/",
  });

  setCookie("devbrand_pkce_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 10,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL}/api/auth/callback/github`,
    scope: "read:user user:email",
    state: stateBase,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return { 
    url: `https://github.com/login/oauth/authorize?${params}`,
    remaining,
    resetAt 
  };
});

export const handleGithubCallback = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string(), state: z.string().optional() }))
  .handler(async ({ data: { code, state } }) => {
    const request = getRequest();
    const ip = request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = request?.headers.get("user-agent") || "unknown";

    const { success } = await rateLimit(`auth:callback:${ip}`, 10, 3600);
    if (!success) {
      const { logSecurityEvent } = await import("./redis");
      await logSecurityEvent("rate_limit_exceeded", null, ip, { action: "callback" });
      throw new Error("AUTH_RATE_LIMIT_REACHED");
    }

    // 0. Verify state for CSRF protection
    const savedStateRaw = getCookie(STATE_COOKIE_NAME);
    const codeVerifier = getCookie("devbrand_pkce_verifier");
    
    deleteCookie(STATE_COOKIE_NAME, { path: "/" });
    deleteCookie("devbrand_pkce_verifier", { path: "/" });
    
    if (!state || !savedStateRaw || !codeVerifier) {
      const { logSecurityEvent } = await import("./redis");
      await logSecurityEvent("oauth_state_mismatch", null, ip, { reason: "missing_data" });
      throw new Error("Invalid OAuth session. Please try again.");
    }

    let stateData;
    try {
      stateData = JSON.parse(savedStateRaw);
    } catch {
      throw new Error("Invalid state format.");
    }

    // Timing-safe comparison
    if (!timingSafeEqual(state, stateData.value)) {
      const { logSecurityEvent } = await import("./redis");
      await logSecurityEvent("oauth_state_mismatch", null, ip, { reason: "value_mismatch" });
      throw new Error("Invalid OAuth state.");
    }

    // IP/UA/Expiration Check
    if (Date.now() - stateData.createdAt > 10 * 60 * 1000) {
      throw new Error("OAuth session expired.");
    }

    // 1. Exchange code for access token (with PKCE)
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        code_verifier: codeVerifier,
        redirect_uri: `${process.env.APP_URL}/api/auth/callback/github`,
      }),
    });
    const { access_token, error } = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };
    if (!access_token) {
      const { logSecurityEvent } = await import("./redis");
      await logSecurityEvent("login_attempt", null, ip, { success: false, error });
      throw new Error(`GitHub OAuth failed: ${error}`);
    }

    // 2. Fetch GitHub profile
    const ghRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}`, "User-Agent": "DevBrand/1.0" },
    });
    const ghUser = (await ghRes.json()) as {
      id: number;
      login: string;
      name?: string;
      avatar_url: string;
      email?: string;
    };

    // 3. Upsert user
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

    // 4. Track login event
    const { logSecurityEvent } = await import("./redis");
    await logSecurityEvent("login_attempt", user.id, ip, { success: true, method: "github" });
    
    await db.insert(userEvents).values({
      userId: user.id,
      eventType: "login",
      payload: { method: "github", ip, ua: userAgent } as any,
    });

    // 5. Set HMAC-signed session cookie
    const signed = await signSession(user.id, user.sessionNonce);
    setCookie(SESSION_COOKIE_NAME, signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return user;
  });

export const updateUserSettings = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      seniority: z.enum(["junior", "mid", "senior", "staff"]).optional(),
      tone: z.enum(["direct", "storytelling", "technical"]).optional(),
    })
  )
  .handler(async ({ data }) => {
    const user = await getSession();
    if (!user) throw new Error("UNAUTHORIZED");
    
    // Rate limit settings changes
    const { success } = await rateLimit(`settings:${user.id}`, 10, 60);
    if (!success) throw new Error("RATE_LIMIT_EXCEEDED");

    const userId = user.id;
    const updates = data;

    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(filtered).length === 0) return { success: true, changed: false };
    
    await db.update(users).set({ ...filtered, updatedAt: new Date() }).where(eq(users.id, userId));
    
    // Audit log
    await db.insert(userEvents).values({
      userId: user.id,
      eventType: "settings_updated",
      payload: { changes: Object.keys(filtered) } as any,
    });

    return { success: true, changed: true };
  });
export const getUserPlan = createServerFn({ method: "GET" })
  .handler(async () => {
    const user = await getSession();
    if (!user) return "free";
    return user.plan;
  });

export const getSecurityEvents = createServerFn({ method: "GET" })
  .handler(async () => {
    const user = await getSession();
    // For now, allow Pro users to see security events (or a specific admin ID)
    if (!user || user.plan !== "pro") throw new Error("UNAUTHORIZED");

    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const events = await redis.zrevrange("security:events", 0, 50);
    return events.map((e: any) => (typeof e === "string" ? JSON.parse(e) : e));
  });

