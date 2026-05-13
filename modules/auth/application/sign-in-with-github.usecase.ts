import { getRequest, setCookie } from "@tanstack/react-start/server";
import { rateLimit } from "@infrastructure/cache/redis.server";
import { env } from "@devbrand/config";
import { StateService } from "../infrastructure/state.service";

const STATE_COOKIE_NAME = "devbrand_oauth_state";

export class SignInWithGithubUseCase {
  constructor(private stateService: StateService) {}

  async execute() {
    const request = getRequest();
    const ip = request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const userAgent = request?.headers.get("user-agent") || "unknown";

    const { success, remaining, resetAt } = await rateLimit(`auth:signin:${ip}`, 5, 3600);
    if (!success) {
      const { logSecurityEvent } = await import("@infrastructure/cache/redis.server");
      await logSecurityEvent("rate_limit_exceeded", null, ip, { action: "signin" });
      return { error: "RATE_LIMIT_REACHED", resetAt };
    }

    const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
    // PKCE challenge logic simplified for this example
    const stateBase = crypto.randomUUID();
    const signedState = await this.stateService.signState(stateBase);
    
    const stateData = {
      value: signedState,
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
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: `${env.APP_URL.replace(/\/+$/, "")}/api/auth/callback/github`,
      scope: "read:user user:email",
      state: stateBase,
    });

    return {
      url: `https://github.com/login/oauth/authorize?${params}`,
      remaining,
      resetAt,
    };
  }
}
