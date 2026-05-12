import crypto from "crypto";
import { describe, it, expect, vi } from "vitest";

// NOTE: vi.mock is hoisted above all imports/consts, so the secret must be
// inlined inside the factory (no closure over module-scope consts).
vi.mock("../lib/env", () => ({
  env: {
    RAZORPAY_WEBHOOK_SECRET: "test-webhook-secret-1234567890",
    DATABASE_URL: "",
  },
}));

const TEST_SECRET = "test-webhook-secret-1234567890";

// Mock db so the verification path doesn't try to read a real Postgres on
// success cases. We only care about signature verification here.
vi.mock("./db.server", () => ({
  db: {
    query: {
      userEvents: {
        findFirst: async () => ({ id: "existing-event" }),
      },
    },
  },
}));

import { processRazorpayWebhookRaw } from "./webhooks.server";

function sign(body: string): string {
  return crypto.createHmac("sha256", TEST_SECRET).update(body).digest("hex");
}

describe("processRazorpayWebhookRaw", () => {
  const validBody = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: { id: "pay_test_123", notes: { userId: "user-uuid" } },
      },
    },
  });

  it("rejects an empty signature", async () => {
    await expect(processRazorpayWebhookRaw(validBody, "")).rejects.toThrow();
  });

  it("rejects a tampered signature", async () => {
    const sig = sign(validBody);
    const tampered = sig.replace(/.$/, sig.at(-1) === "a" ? "b" : "a");
    await expect(
      processRazorpayWebhookRaw(validBody, tampered),
    ).rejects.toThrow(/signature verification failed/i);
  });

  it("rejects a signature computed with the wrong secret", async () => {
    const wrongSig = crypto
      .createHmac("sha256", "different-secret")
      .update(validBody)
      .digest("hex");
    await expect(
      processRazorpayWebhookRaw(validBody, wrongSig),
    ).rejects.toThrow(/signature verification failed/i);
  });

  it("rejects when the body has been altered post-signing", async () => {
    const sig = sign(validBody);
    const altered = validBody.replace("pay_test_123", "pay_evil_456");
    await expect(processRazorpayWebhookRaw(altered, sig)).rejects.toThrow(
      /signature verification failed/i,
    );
  });

  it("accepts a correctly-signed body (idempotency short-circuit path)", async () => {
    const sig = sign(validBody);
    const result = await processRazorpayWebhookRaw(validBody, sig);
    // findFirst is mocked to return an existing event, so we expect the
    // already_processed short-circuit. The point of this test is that we get
    // past signature verification with a valid signature.
    expect(result.received).toBe(true);
    expect(result.status).toBe("already_processed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GitHub webhook signature verification — pure function, no DB

import { verifyGithubSignature } from "./webhooks.server";

describe("verifyGithubSignature", () => {
  const secret = "ghs_test_secret_abcdef";
  const body = JSON.stringify({ action: "closed", number: 42 });
  const validSig =
    "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

  it("accepts a correctly-signed body", () => {
    expect(verifyGithubSignature(body, validSig, secret)).toBe(true);
  });

  it("accepts the hex form without the sha256= prefix", () => {
    const bare = validSig.slice("sha256=".length);
    expect(verifyGithubSignature(body, bare, secret)).toBe(true);
  });

  it("rejects null / undefined signature", () => {
    expect(verifyGithubSignature(body, null, secret)).toBe(false);
    expect(verifyGithubSignature(body, undefined, secret)).toBe(false);
  });

  it("rejects a signature signed with the wrong secret", () => {
    const wrong =
      "sha256=" +
      crypto.createHmac("sha256", "other_secret").update(body).digest("hex");
    expect(verifyGithubSignature(body, wrong, secret)).toBe(false);
  });

  it("rejects when the body was tampered with after signing", () => {
    const tamperedBody = body.replace("42", "9999");
    expect(verifyGithubSignature(tamperedBody, validSig, secret)).toBe(false);
  });

  it("rejects truncated signatures", () => {
    const truncated = validSig.slice(0, -4);
    expect(verifyGithubSignature(body, truncated, secret)).toBe(false);
  });

  it("rejects signatures of the wrong length without throwing", () => {
    expect(verifyGithubSignature(body, "sha256=abcd", secret)).toBe(false);
  });
});
