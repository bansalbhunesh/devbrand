import { describe, it, expect, vi } from "vitest";

vi.mock("../lib/env", () => ({
  env: {
    SESSION_SECRET: "test-session-secret-must-be-at-least-32-bytes-long!!",
    APP_URL: "https://example.test",
    DATABASE_URL: "",
  },
}));

// Skip the parts of auth.server.ts that touch cookies / DB; only signState +
// verifyState need to be reachable for the round-trip.
vi.mock("@tanstack/react-start/server", () => ({
  getCookie: () => undefined,
  setCookie: () => undefined,
  deleteCookie: () => undefined,
  getRequest: () => undefined,
}));

vi.mock("./db.server", () => ({ db: {} }));
vi.mock("./schema.server", () => ({ users: {} }));
vi.mock("./redis", () => ({
  rateLimit: async () => ({ success: true, remaining: 5, resetAt: 0 }),
}));

import { signState, verifyState } from "./auth.server";

describe("OAuth state HMAC", () => {
  it("round-trips the original state", async () => {
    const original = "11111111-2222-3333-4444-555555555555";
    const signed = await signState(original);
    expect(signed).not.toBe(original);
    expect(signed).toMatch(/^[a-f0-9-]+\.[A-Za-z0-9_-]+$/);
    const recovered = await verifyState(signed);
    expect(recovered).toBe(original);
  });

  it("rejects a signature swapped with the wrong state", async () => {
    const signedA = await signState("aaaa");
    const signedB = await signState("bbbb");
    const sigA = signedA.split(".")[1];
    const stateB = signedB.split(".")[0];
    const forged = `${stateB}.${sigA}`;
    const recovered = await verifyState(forged);
    expect(recovered).toBeNull();
  });

  it("rejects malformed signed-state strings without throwing", async () => {
    // No dots: split returns 1-part array, parts.length !== 2, returns null.
    expect(await verifyState("no-dot-here")).toBeNull();
    // One dot but garbage signature: shape parses, HMAC fails, returns null.
    expect(await verifyState("only.two")).toBeNull();
    // Empty string: parts.length === 1, returns null.
    expect(await verifyState("")).toBeNull();
    // Three dots: shape mismatch, returns null.
    expect(await verifyState("a.b.c.d")).toBeNull();
  });

  it("rejects a forged signature", async () => {
    const signed = await signState("real-state");
    const [state] = signed.split(".");
    const forged = `${state}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    expect(await verifyState(forged)).toBeNull();
  });
});
