import { db } from "./db.server";
import { scheduledPosts, backgroundJobs, outputs } from "./schema.server";
import { and, eq, desc } from "drizzle-orm";
import { loadSessionUser } from "./auth.server";

const VALID_CHANNELS = new Set(["linkedin", "twitter"]);
const VALID_POST_KINDS = new Set([
  "linkedinPost1",
  "linkedinPost2",
  "linkedinPost3",
  "twitterThread",
]);

export async function schedulePostFn(data: {
  outputId: string;
  channel: string;
  postKind: string;
  scheduledFor: string;
}) {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  if (!VALID_CHANNELS.has(data.channel)) throw new Error("INVALID_CHANNEL");
  if (!VALID_POST_KINDS.has(data.postKind))
    throw new Error("INVALID_POST_KIND");

  const when = new Date(data.scheduledFor);
  if (Number.isNaN(when.getTime())) throw new Error("INVALID_SCHEDULED_FOR");
  // Minimum 30s in the future to keep the cron tick coherent — a "schedule
  // now" use-case should be a synchronous publish, not a job.
  const minLead = Date.now() + 30_000;
  if (when.getTime() < minLead) throw new Error("SCHEDULED_FOR_TOO_SOON");

  const output = await db.query.outputs.findFirst({
    where: and(eq(outputs.id, data.outputId), eq(outputs.userId, user.id)),
  });
  if (!output) throw new Error("OUTPUT_NOT_FOUND");

  const [post] = await db
    .insert(scheduledPosts)
    .values({
      userId: user.id,
      outputId: data.outputId,
      channel: data.channel,
      postKind: data.postKind,
      scheduledFor: when,
      status: "SCHEDULED",
    })
    .returning();

  const [job] = await db
    .insert(backgroundJobs)
    .values({
      userId: user.id,
      type: "publish_scheduled_post",
      status: "PENDING",
      payload: { scheduledPostId: post.id } as any,
      scheduledFor: when,
    })
    .returning({ id: backgroundJobs.id });

  await db
    .update(scheduledPosts)
    .set({ jobId: job.id })
    .where(eq(scheduledPosts.id, post.id));

  return { ...post, jobId: job.id };
}

export async function listScheduledPostsFn() {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const rows = await db
    .select({
      id: scheduledPosts.id,
      outputId: scheduledPosts.outputId,
      channel: scheduledPosts.channel,
      postKind: scheduledPosts.postKind,
      scheduledFor: scheduledPosts.scheduledFor,
      status: scheduledPosts.status,
      readyAt: scheduledPosts.readyAt,
      shareUrl: scheduledPosts.shareUrl,
      createdAt: scheduledPosts.createdAt,
      outputSlug: outputs.slug,
      outputTitle: outputs.prTitle,
    })
    .from(scheduledPosts)
    .leftJoin(outputs, eq(scheduledPosts.outputId, outputs.id))
    .where(eq(scheduledPosts.userId, user.id))
    .orderBy(desc(scheduledPosts.scheduledFor));

  return { posts: rows };
}

export async function cancelScheduledPostFn(data: { id: string }) {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const existing = await db.query.scheduledPosts.findFirst({
    where: and(
      eq(scheduledPosts.id, data.id),
      eq(scheduledPosts.userId, user.id),
    ),
  });
  if (!existing) throw new Error("NOT_FOUND");
  if (existing.status !== "SCHEDULED") throw new Error("NOT_CANCELLABLE");

  await db
    .update(scheduledPosts)
    .set({ status: "CANCELLED" })
    .where(eq(scheduledPosts.id, data.id));

  if (existing.jobId) {
    await db
      .update(backgroundJobs)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(
        and(
          eq(backgroundJobs.id, existing.jobId),
          eq(backgroundJobs.status, "PENDING"),
        ),
      );
  }

  return { cancelled: true };
}
