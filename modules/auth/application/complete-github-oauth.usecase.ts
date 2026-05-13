import {
  getCookie,
  deleteCookie,
  getRequest,
} from "@tanstack/react-start/server";
import { db } from "@infrastructure/database/db.server";
import { users } from "@infrastructure/database/schema.server";
import { env } from "@devbrand/config";
import { StateService } from "../infrastructure/state.service";
import { SessionService } from "../infrastructure/session.service";
import { rateLimit } from "@infrastructure/cache/redis.server";

const STATE_COOKIE_NAME = "devbrand_oauth_state";

export class CompleteGithubOAuthUseCase {
  constructor(
    private stateService: StateService,
    private sessionService: SessionService,
  ) {}

  async execute(data: { code: string; state?: string }) {
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

    const stateData = JSON.parse(savedStateRaw);
    const verifiedState = await this.stateService.verifyState(stateData.value);

    if (!verifiedState || state !== verifiedState) {
      throw new Error("Invalid OAuth state signature.");
    }

    // 1. Exchange Code for Token
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
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
          redirect_uri: `${env.APP_URL.replace(/\/+$/, "")}/api/auth/callback/github`,
        }),
      },
    );
    const { access_token } = await tokenRes.json();
    if (!access_token) throw new Error("GitHub OAuth failed");

    // 2. Fetch User Profile
    const ghRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "User-Agent": "DevBrand/1.0",
      },
    });
    const ghUser = await ghRes.json();

    // 3. Upsert User
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

    // 4. Create Session
    const signed = await this.sessionService.signSession(
      user.id,
      user.sessionNonce,
    );
    this.sessionService.setSessionCookie(signed);

    return user;
  }
}
