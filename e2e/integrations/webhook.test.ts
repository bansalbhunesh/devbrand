import { describe, it, expect, vi, beforeEach } from "vitest";
import { processGithubWebhookRaw } from "../../apps/web/src/server/webhooks.server";
import crypto from "crypto";

// Mock the database and job queue
vi.mock("@infrastructure/database/db.server", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "delivery-123" }])
        }),
        returning: vi.fn().mockResolvedValue([{ id: "job-123" }])
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(true)
      })
    }),
    query: {
      trackedRepos: {
        findMany: vi.fn().mockResolvedValue([
          { userId: "user-1", webhookSecret: "test-secret" }
        ])
      }
    }
  }
}));

describe("GitHub Webhook Integration", () => {
  const secret = "test-secret";
  
  const generateSignature = (payload: string) => {
    return "sha256=" + crypto.createHmac("sha256", secret).update(payload).digest("hex");
  };

  it("should successfully enqueue a job for a merged PR", async () => {
    const payload = JSON.stringify({
      action: "closed",
      pull_request: {
        number: 42,
        merged: true,
        user: { type: "User" }
      },
      repository: {
        full_name: "bansalbhunesh/devbrand"
      }
    });

    const signature = generateSignature(payload);

    const result = await processGithubWebhookRaw(payload, {
      signature,
      deliveryId: "del-123",
      event: "pull_request"
    });

    expect(result.status).toBe("enqueued");
    if (result.status === "enqueued") {
      expect(result.jobIds).toContain("job-123");
    }
  });

  it("should reject invalid HMAC signatures", async () => {
    const payload = JSON.stringify({
      action: "closed",
      pull_request: { number: 42, merged: true, user: { type: "User" } },
      repository: { full_name: "bansalbhunesh/devbrand" }
    });

    // Use wrong secret
    const badSignature = "sha256=" + crypto.createHmac("sha256", "wrong-secret").update(payload).digest("hex");

    const result = await processGithubWebhookRaw(payload, {
      signature: badSignature,
      deliveryId: "del-124",
      event: "pull_request"
    });

    expect(result.status).toBe("invalid_sig");
  });

  it("should filter out non-merged PRs", async () => {
    const payload = JSON.stringify({
      action: "closed",
      pull_request: {
        number: 42,
        merged: false, // PR was closed without merging
        user: { type: "User" }
      },
      repository: {
        full_name: "bansalbhunesh/devbrand"
      }
    });

    const signature = generateSignature(payload);

    const result = await processGithubWebhookRaw(payload, {
      signature,
      deliveryId: "del-125",
      event: "pull_request"
    });

    expect(result.status).toBe("filtered");
  });
});
