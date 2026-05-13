import { db } from "@infrastructure/database/db.server";
import { users } from "@infrastructure/database/schema.server";
import { eq } from "drizzle-orm";
import { SessionService } from "../infrastructure/session.service";
import { getRequest } from "@tanstack/react-start/server";

const SESSION_ROTATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class LoadSessionUserUseCase {
  constructor(private sessionService: SessionService) {}

  async execute() {
    const raw = this.sessionService.getRawSessionCookie();
    if (!raw) return null;

    const session = await this.sessionService.verifySession(raw);
    if (!session) return null;

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
      with: { profile: true },
    });

    if (!user) return null;

    // Security check: session mismatch
    if (session.sessionNonce && session.sessionNonce !== user.sessionNonce) {
      const request = getRequest();
      const ip = request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
      const { logSecurityEvent } = await import("@infrastructure/cache/redis.server");
      await logSecurityEvent("session_mismatch", user.id, ip, { reason: "invalid_nonce" });
      this.sessionService.deleteSessionCookie();
      return null;
    }

    // Session Rotation
    const shouldRotate = Date.now() - session.issuedAt > SESSION_ROTATION_INTERVAL_MS;
    if (shouldRotate) {
      const newSigned = await this.sessionService.signSession(session.userId, user.sessionNonce, { rotate: true });
      this.sessionService.setSessionCookie(newSigned);
    }

    return user;
  }
}
