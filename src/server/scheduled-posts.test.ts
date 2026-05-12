import { describe, expect, it, vi } from "vitest";

// Stub env so importing scheduled-posts.server doesn't crash on missing
// DATABASE_URL during module load.
vi.mock("../lib/env", () => ({
  env: { DATABASE_URL: "", APP_URL: "https://devbrand.ai" },
}));

// auth.server pulls in TanStack Start request context. Replace it with a
// trivial stub so the validation tests can short-circuit before touching it.
vi.mock("./auth.server", () => ({
  loadSessionUser: async () => ({ id: "user-1", role: "user" }),
  ensureAdmin: async () => undefined,
}));

// db.server is touched at module-import time by jobs.server. We stub the
// proxy so an accidental access throws — none of these tests should reach it.
vi.mock("./db.server", () => ({
  db: new Proxy(
    {},
    {
      get() {
        throw new Error("db should not be accessed in validation tests");
      },
    },
  ),
}));

import { schedulePostFn } from "./scheduled-posts.server";

describe("schedulePostFn validation", () => {
  const validOutputId = "00000000-0000-0000-0000-000000000001";

  it("rejects an unknown channel before touching the database", async () => {
    await expect(
      schedulePostFn({
        outputId: validOutputId,
        channel: "instagram",
        postKind: "linkedinPost1",
        scheduledFor: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).rejects.toThrow("INVALID_CHANNEL");
  });

  it("rejects an unknown post kind before touching the database", async () => {
    await expect(
      schedulePostFn({
        outputId: validOutputId,
        channel: "linkedin",
        postKind: "linkedinPost9",
        scheduledFor: new Date(Date.now() + 60_000).toISOString(),
      }),
    ).rejects.toThrow("INVALID_POST_KIND");
  });

  it("rejects a non-parseable scheduledFor", async () => {
    await expect(
      schedulePostFn({
        outputId: validOutputId,
        channel: "linkedin",
        postKind: "linkedinPost1",
        scheduledFor: "not-a-date",
      }),
    ).rejects.toThrow("INVALID_SCHEDULED_FOR");
  });

  it("rejects a scheduledFor too soon (<30s ahead)", async () => {
    await expect(
      schedulePostFn({
        outputId: validOutputId,
        channel: "linkedin",
        postKind: "linkedinPost1",
        scheduledFor: new Date(Date.now() + 5_000).toISOString(),
      }),
    ).rejects.toThrow("SCHEDULED_FOR_TOO_SOON");
  });
});
