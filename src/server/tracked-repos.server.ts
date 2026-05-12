import crypto from "crypto";
import { db } from "./db.server";
import { trackedRepos } from "./schema.server";
import { and, eq, desc } from "drizzle-orm";
import { loadSessionUser } from "./auth.server";
import { env } from "../lib/env";

/**
 * Per-repo HMAC secret used to verify incoming GitHub webhooks. 32 bytes
 * of CSPRNG entropy gives 256-bit security; the hex encoding keeps it
 * paste-friendly in GitHub's Webhook settings UI without losing entropy.
 */
function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

function webhookUrl(): string {
  // env.APP_URL is the canonical public origin (e.g. https://devbrand.ai)
  // — see src/lib/env.ts. Trailing slash defensively stripped.
  const base = (env.APP_URL ?? "").replace(/\/+$/, "");
  return `${base}/webhooks/github`;
}

export async function listTrackedReposFn() {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const rows = await db
    .select({
      id: trackedRepos.id,
      owner: trackedRepos.owner,
      repo: trackedRepos.repo,
      autoPublish: trackedRepos.autoPublish,
      createdAt: trackedRepos.createdAt,
    })
    .from(trackedRepos)
    .where(eq(trackedRepos.userId, user.id))
    .orderBy(desc(trackedRepos.createdAt));

  return { repos: rows, webhookUrl: webhookUrl() };
}

export async function registerTrackedRepoFn(data: {
  owner: string;
  repo: string;
}) {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const existing = await db.query.trackedRepos.findFirst({
    where: and(
      eq(trackedRepos.userId, user.id),
      eq(trackedRepos.owner, data.owner),
      eq(trackedRepos.repo, data.repo),
    ),
  });
  if (existing) throw new Error("ALREADY_TRACKED");

  const secret = generateWebhookSecret();
  const [row] = await db
    .insert(trackedRepos)
    .values({
      userId: user.id,
      owner: data.owner,
      repo: data.repo,
      webhookSecret: secret,
    })
    .returning();

  // Secret returned ONCE on creation. listTrackedReposFn intentionally never
  // re-emits it — if the user loses it, they rotate via rotateWebhookSecret.
  return {
    id: row.id,
    owner: row.owner,
    repo: row.repo,
    autoPublish: row.autoPublish,
    createdAt: row.createdAt,
    webhookUrl: webhookUrl(),
    webhookSecret: secret,
  };
}

export async function rotateWebhookSecretFn(data: { id: string }) {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const existing = await db.query.trackedRepos.findFirst({
    where: and(eq(trackedRepos.id, data.id), eq(trackedRepos.userId, user.id)),
  });
  if (!existing) throw new Error("NOT_FOUND");

  const secret = generateWebhookSecret();
  await db
    .update(trackedRepos)
    .set({ webhookSecret: secret })
    .where(eq(trackedRepos.id, data.id));

  return { id: data.id, webhookSecret: secret };
}

export async function deleteTrackedRepoFn(data: { id: string }) {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const result = await db
    .delete(trackedRepos)
    .where(and(eq(trackedRepos.id, data.id), eq(trackedRepos.userId, user.id)))
    .returning({ id: trackedRepos.id });

  if (result.length === 0) throw new Error("NOT_FOUND");
  return { deleted: true };
}
