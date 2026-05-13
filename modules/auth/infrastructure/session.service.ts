import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { env } from "@devbrand/config";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class SessionService {
  private sessionCookieName(): string {
    return import.meta.env.PROD ? "__Secure-devbrand_sid" : "devbrand_sid";
  }

  private cookieSecure(): boolean {
    return process.env.NODE_ENV === "production" || import.meta.env.PROD;
  }

  private async getKey(): Promise<CryptoKey> {
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

  async signSession(userId: string, sessionNonce: string, options?: { rotate?: boolean }): Promise<string> {
    const key = await this.getKey();
    const enc = new TextEncoder();
    const ts = Date.now().toString(36);
    const nonce = options?.rotate ? crypto.randomUUID().slice(0, 8) : "";
    const payload = nonce ? `${userId}.${ts}.${sessionNonce}.${nonce}` : `${userId}.${ts}.${sessionNonce}`;
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    return `${payload}.${sigB64}`;
  }

  async verifySession(cookie: string) {
    try {
      const parts = cookie.split(".");
      if (parts.length < 3) return null;
      const sigB64 = parts[parts.length - 1];
      const payload = parts.slice(0, parts.length - 1).join(".");
      const key = await this.getKey();
      const enc = new TextEncoder();
      const normalizedSig = sigB64.replace(/-/g, "+").replace(/_/g, "/");
      const sig = Uint8Array.from(atob(normalizedSig), (c) => c.charCodeAt(0));
      const valid = await crypto.subtle.verify("HMAC", key, sig, enc.encode(payload));
      if (!valid) return null;
      const [userId, ts, sessionNonce] = parts;
      const issuedAt = parseInt(ts, 36);
      if (isNaN(issuedAt) || Date.now() - issuedAt > SESSION_TTL_MS) return null;
      return { userId, issuedAt, sessionNonce: sessionNonce || "" };
    } catch {
      return null;
    }
  }

  getRawSessionCookie() {
    return getCookie(this.sessionCookieName());
  }

  setSessionCookie(signed: string) {
    setCookie(this.sessionCookieName(), signed, {
      httpOnly: true,
      secure: this.cookieSecure(),
      sameSite: "strict",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }

  deleteSessionCookie() {
    deleteCookie(this.sessionCookieName(), { path: "/" });
  }
}
