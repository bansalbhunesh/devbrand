import { env } from "@devbrand/config";

export class StateService {
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

  async signState(state: string): Promise<string> {
    const key = await this.getKey();
    const enc = new TextEncoder();
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(state));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    return `${state}.${sigB64}`;
  }

  async verifyState(signedState: string): Promise<string | null> {
    const parts = signedState.split(".");
    if (parts.length !== 2) return null;
    const [state, sigB64] = parts;
    const key = await this.getKey();
    const enc = new TextEncoder();

    const normalizedSig = sigB64.replace(/-/g, "+").replace(/_/g, "/");
    const sig = Uint8Array.from(atob(normalizedSig), (c: string) =>
      c.charCodeAt(0),
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sig,
      enc.encode(state),
    );
    return valid ? state : null;
  }
}
