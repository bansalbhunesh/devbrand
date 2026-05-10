import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCookie, setCookie, deleteCookie } from "vinxi/http";
import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

// Session handling logic (simplified for Phase 1)
// In a real app, you'd encrypt this or store in KV.
const SESSION_COOKIE_NAME = "devbrand_session";

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const sessionId = getCookie(SESSION_COOKIE_NAME);
  if (!sessionId) return null;

  const user = await db.query.users.findFirst({
    where: eq(users.id, sessionId),
  });

  return user ?? null;
});

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE_NAME);
  return { success: true };
});

export const signInWithGithub = createServerFn({ method: "GET" }).handler(async () => {
  const root = "https://github.com/login/oauth/authorize";
  const options = {
    client_id: process.env.GITHUB_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL}/api/auth/callback/github`,
    scope: "read:user user:email repo",
    state: "random_state_string", // In prod, use a secure random string and verify it
  };
  const qs = new URLSearchParams(options).toString();
  return { url: `${root}?${qs}` };
});

export const handleGithubCallback = createServerFn({ method: "POST" })
  .validator(z.object({ code: z.string() }))
  .handler(async ({ data: { code } }) => {
    // 1. Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const { access_token } = await tokenResponse.json() as { access_token: string };

    // 2. Fetch user profile
    const userResponse = await fetch("https://api.github.com/user", {
      headers: { Authorization: `token ${access_token}` },
    });
    const ghUser = await userResponse.json() as any;

    // 3. Upsert user in DB
    const [user] = await db.insert(users).values({
      githubId: ghUser.id.toString(),
      githubLogin: ghUser.login,
      name: ghUser.name,
      avatarUrl: ghUser.avatar_url,
      email: ghUser.email,
    }).onConflictDoUpdate({
      target: users.githubId,
      set: { 
        githubLogin: ghUser.login,
        name: ghUser.name,
        avatarUrl: ghUser.avatar_url,
        email: ghUser.email,
        updatedAt: new Date(),
      },
    }).returning();

    // 4. Set session cookie
    setCookie(SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return user;
  });
