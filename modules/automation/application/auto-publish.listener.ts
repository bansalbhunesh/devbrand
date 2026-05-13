import { EventBus } from "@/modules/core/events/event-bus";
import { db } from "@infrastructure/database/db.server";
import { trackedRepos, outputs } from "@infrastructure/database/schema.server";
import { and, eq } from "drizzle-orm";

export class AutoPublishListener {
  constructor(private eventBus: EventBus) {}

  init() {
    this.eventBus.on("TRANSFORM_COMPLETED", async (event) => {
      const { userId, outputId } = event.payload;

      // 1. Get the output details (specifically the prUrl)
      const output = await db.query.outputs.findFirst({
        where: eq(outputs.id, outputId)
      });
      if (!output) return;

      // 2. Check if this repo is set to auto-publish
      const prUrl = output.prUrl;
      const parts = prUrl.split("/");
      const owner = parts[parts.length - 4];
      const repoName = parts[parts.length - 3];

      const repo = await db.query.trackedRepos.findFirst({
        where: and(
          eq(trackedRepos.userId, userId),
          eq(trackedRepos.owner, owner),
          eq(trackedRepos.repo, repoName),
          eq(trackedRepos.autoPublish, true)
        )
      });

      if (repo) {
        console.log(`[AutoPublish] Triggering publish for ${outputId} on repo ${owner}/${repoName}`);
        // Here we would call the PublishUseCase or schedule it
        // For now, we log the intent.
      }
    });
  }
}
