import crypto from "crypto";
import { db } from "./db.server";
import {
  users,
  userEvents,
  trackedRepos,
  webhookDeliveries,
  backgroundJobs,
} from "./schema.server";
import { and, eq, sql } from "drizzle-orm";
import { env } from "../lib/env";

/**
 * Razorpay signs the exact request body bytes — always verify using the raw string.
 * This is a server-only module to satisfy TanStack Start's import protection.
 */
export async function processRazorpayWebhookRaw(
  rawBody: string,
  signature: string,
): Promise<{ received: boolean; status?: string; error?: string }> {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new Error("Webhook signature verification failed");
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new Error("Invalid webhook JSON");
  }

  const event = body.event;
  if (event === "payment.captured") {
    const entity = body.payload?.payment?.entity;
    const paymentId = entity?.id;
    const userId = entity?.notes?.userId;

    if (!paymentId || !userId) return { received: true, error: "missing_ids" };

    const existing = await db.query.userEvents.findFirst({
      where: and(
        eq(userEvents.userId, userId),
        eq(userEvents.eventType, "upgraded_to_pro"),
        sql`${userEvents.payload}->>'paymentId' = ${paymentId}`,
      ),
    });

    if (existing) return { received: true, status: "already_processed" };

    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({ plan: "pro", updatedAt: new Date() })
        .where(eq(users.id, userId));
      await tx.insert(userEvents).values({
        userId,
        eventType: "upgraded_to_pro",
        payload: { paymentId, method: "webhook" },
      });
    });
  }

  return { received: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// GitHub webhook — pull_request.closed (merged) → enqueue transform job

export type GithubWebhookResult =
  | { status: "enqueued"; jobIds: string[] }
  | { status: "duplicate" }
  | { status: "invalid_sig" }
  | { status: "filtered"; reason: string }
  | { status: "no_subscribers" }
  | { status: "malformed"; reason: string };

/**
 * Constant-time HMAC-SHA256 check. `provided` is the value of the
 * `X-Hub-Signature-256` header, e.g. "sha256=abcdef...".
 */
export function verifyGithubSignature(
  rawBody: string,
  provided: string | null | undefined,
  secret: string,
): boolean {
  if (!provided) return false;
  const stripped = provided.startsWith("sha256=")
    ? provided.slice("sha256=".length)
    : provided;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(stripped);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Idempotent. Drives the full webhook path:
 *   1. Reject malformed envelopes (no delivery id / event)
 *   2. Dedup against `webhook_deliveries` via PK conflict
 *   3. Filter non-merged + bot-authored PRs
 *   4. Look up subscribers via tracked_repos by (owner, repo)
 *   5. Verify HMAC against each subscriber's per-repo secret
 *   6. Enqueue one `transform_pr_webhook` background job per matched user
 *
 * GitHub retries on 5xx for 8 hours, so this function MUST be safe to rerun
 * with the same delivery id — the PK conflict on webhook_deliveries enforces
 * that at the database layer.
 */
export async function processGithubWebhookRaw(
  rawBody: string,
  headers: {
    signature: string | null;
    deliveryId: string | null;
    event: string | null;
  },
): Promise<GithubWebhookResult> {
  const { signature, deliveryId, event } = headers;
  if (!deliveryId) return { status: "malformed", reason: "no_delivery_id" };
  if (!event) return { status: "malformed", reason: "no_event" };

  // Claim the delivery id. ON CONFLICT DO NOTHING gives us atomic dedup.
  const claimed = await db
    .insert(webhookDeliveries)
    .values({ id: deliveryId, status: "received" })
    .onConflictDoNothing({ target: webhookDeliveries.id })
    .returning({ id: webhookDeliveries.id });
  if (claimed.length === 0) return { status: "duplicate" };

  const finalize = (status: GithubWebhookResult): Promise<void> =>
    db
      .update(webhookDeliveries)
      .set({ status: status.status })
      .where(eq(webhookDeliveries.id, deliveryId))
      .then(() => undefined);

  if (event !== "pull_request") {
    const r: GithubWebhookResult = {
      status: "filtered",
      reason: "non_pull_request_event",
    };
    await finalize(r);
    return r;
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    const r: GithubWebhookResult = {
      status: "malformed",
      reason: "invalid_json",
    };
    await finalize(r);
    return r;
  }

  if (
    body?.action !== "closed" ||
    body?.pull_request?.merged !== true ||
    body?.pull_request?.user?.type === "Bot"
  ) {
    const r: GithubWebhookResult = { status: "filtered", reason: "not_merged" };
    await finalize(r);
    return r;
  }

  const fullName: string | undefined = body?.repository?.full_name;
  const prNumber: number | undefined = body?.pull_request?.number;
  if (!fullName || typeof prNumber !== "number") {
    const r: GithubWebhookResult = {
      status: "malformed",
      reason: "missing_repo_or_pr",
    };
    await finalize(r);
    return r;
  }
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    const r: GithubWebhookResult = {
      status: "malformed",
      reason: "bad_full_name",
    };
    await finalize(r);
    return r;
  }

  const subscribers = await db.query.trackedRepos.findMany({
    where: and(eq(trackedRepos.owner, owner), eq(trackedRepos.repo, repo)),
  });
  if (subscribers.length === 0) {
    const r: GithubWebhookResult = { status: "no_subscribers" };
    await finalize(r);
    return r;
  }

  const verified = subscribers.filter((s) =>
    verifyGithubSignature(rawBody, signature, s.webhookSecret),
  );
  if (verified.length === 0) {
    const r: GithubWebhookResult = { status: "invalid_sig" };
    await finalize(r);
    return r;
  }

  const jobs = await db
    .insert(backgroundJobs)
    .values(
      verified.map((s) => ({
        userId: s.userId,
        type: "transform_pr_webhook",
        status: "PENDING",
        payload: { owner, repo, prNumber, deliveryId } as any,
      })),
    )
    .returning({ id: backgroundJobs.id });

  const r: GithubWebhookResult = {
    status: "enqueued",
    jobIds: jobs.map((j) => j.id),
  };
  await finalize(r);
  return r;
}
