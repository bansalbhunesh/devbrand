import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock env before importing redis so the module-scoped _redis cache starts cold.
vi.mock("../lib/env", () => ({
  env: {
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    RATE_LIMIT_FAIL_OPEN: false,
  },
}));

import { rateLimit } from "./redis";
import { env } from "../lib/env";

describe("rateLimit fallback behavior", () => {
  beforeEach(() => {
    // Reset the fail-open knob between cases.
    (env as { RATE_LIMIT_FAIL_OPEN: boolean }).RATE_LIMIT_FAIL_OPEN = false;
  });

  it("fails CLOSED when Redis credentials are absent and RATE_LIMIT_FAIL_OPEN is false", async () => {
    const result = await rateLimit("test:no-redis", 5, 60);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("respects the RATE_LIMIT_FAIL_OPEN dev opt-in", async () => {
    (env as { RATE_LIMIT_FAIL_OPEN: boolean }).RATE_LIMIT_FAIL_OPEN = true;
    const result = await rateLimit("test:fail-open", 5, 60);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("never returns success when both Redis is down and fail-open is off — regression test for the prior fail-open default", async () => {
    // 50 sequential calls; none should succeed since Redis is unreachable and
    // fail-open is the default-off. Catches accidental regressions to the
    // pre-Sprint-1 behavior where this surface silently uncapped.
    for (let i = 0; i < 50; i++) {
      const result = await rateLimit(`test:regression:${i}`, 5, 60);
      expect(result.success).toBe(false);
    }
  });
});
