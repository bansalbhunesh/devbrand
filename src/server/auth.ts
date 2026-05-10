import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCookie, setCookie, deleteCookie } from "vinxi/http";
import { db } from "./db";
import { users, userEvents } from "./schema";
import { eq } from "drizzle-orm";

const SESSION_COOKIE_NAME = "devbrand_sid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// ── HMAC helpers ────────────────────────────────────────────────────────────

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

async function signSession(userId: string): Promise<string> {
  const key = await getKey();
  const enc = new TextEncoder();
  const ts = Date.now().toString(36);
  const payload = `${userId}.${ts}`;
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payload}.${sigB64}`;
}

async function verifySession(cookie: string): Promise<string | null> {
  try {
    const parts = cookie.split(".");
    if (parts.length !== 3) return null;
    const [userId, ts, sigB64] = parts;
    const payload = `${userId}.${ts}`;
    const key = await getKey();
    const enc = new TextEncoder();
    const sig = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, enc.encode(payload));
    return valid ? userId : null;
  } catch {
    return null;
  }
}

// ── Server functions ─────────────────────────────────────────────────────────

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const raw = getCookie(SESSION_COOKIE_NAME);
  if (!raw) return null;

  const userId = await verifySession(raw);
  if (!userId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { profile: true },
  });
  return user ?? null;
});

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE_NAME);
  return { success: true };
});

export const signInWithGithub = createServerFn({ method: "GET" }).handler(async () => {
  const state = crypto.randomUUID(); 
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL}/api/auth/callback/github`,
    scope: "read:user user:email",
    state,
  });
  return { url: `https://github.com/login/oauth/authorize?${params}` };
});

export const handleGithubCallback = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string(), state: z.string().optional() }))
  .handler(async ({ data: { code } }) => {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const { access_token, error } = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };
    if (!access_token) throw new Error(`GitHub OAuth failed: ${error}`);

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
    await db.insert(userEvents).values({
      userId: user.id,
      eventType: "login",
      payload: { method: "github" },
    });

    // 5. Set HMAC-signed session cookie
    const signed = await signSession(user.id);
    setCookie(SESSION_COOKIE_NAME, signed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return user;
  });

export const updateUserSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      userId: z.string().uuid(),
      seniority: z.enum(["junior", "mid", "senior", "staff"]).optional(),
      tone: z.enum(["direct", "storytelling", "technical"]).optional(),
    })
  )
  .handler(async ({ data }) => {
    const { userId, ...updates } = data;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(filtered).length === 0) return;
    await db.update(users).set({ ...filtered, updatedAt: new Date() }).where(eq(users.id, userId));
    return { success: true };
  });
export const getUserPlan = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: userId }) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    return user?.plan ?? "free";
  });
