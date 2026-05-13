import { db } from "@infrastructure/database/db.server";
import {
  scheduledPosts,
  backgroundJobs,
  outputs,
} from "@infrastructure/database/schema.server";
import { and, eq } from "drizzle-orm";

const VALID_CHANNELS = new Set(["linkedin", "twitter"]);
const VALID_POST_KINDS = new Set([
  "linkedinPost1",
  "linkedinPost2",
  "linkedinPost3",
  "twitterThread",
]);

export class SchedulePostUseCase {
  async execute(
    userId: string,
    data: {
      outputId: string;
      channel: string;
      postKind: string;
      scheduledFor: string;
    },
  ) {
    if (!VALID_CHANNELS.has(data.channel)) throw new Error("INVALID_CHANNEL");
    if (!VALID_POST_KINDS.has(data.postKind))
      throw new Error("INVALID_POST_KIND");

    const when = new Date(data.scheduledFor);
    if (Number.isNaN(when.getTime())) throw new Error("INVALID_SCHEDULED_FOR");
    const minLead = Date.now() + 30_000;
    if (when.getTime() < minLead) throw new Error("SCHEDULED_FOR_TOO_SOON");

    const output = await db.query.outputs.findFirst({
      where: and(eq(outputs.id, data.outputId), eq(outputs.userId, userId)),
    });
    if (!output) throw new Error("OUTPUT_NOT_FOUND");

    return db.transaction(async (tx) => {
      const [post] = await tx
        .insert(scheduledPosts)
        .values({
          userId,
          outputId: data.outputId,
          channel: data.channel,
          postKind: data.postKind,
          scheduledFor: when,
          status: "SCHEDULED",
        })
        .returning();

      const [job] = await tx
        .insert(backgroundJobs)
        .values({
          userId,
          type: "publish_scheduled_post",
          status: "PENDING",
          payload: { scheduledPostId: post.id } as any,
          scheduledFor: when,
        })
        .returning({ id: backgroundJobs.id });

      await tx
        .update(scheduledPosts)
        .set({ jobId: job.id })
        .where(eq(scheduledPosts.id, post.id));

      return { ...post, jobId: job.id };
    });
  }
}
