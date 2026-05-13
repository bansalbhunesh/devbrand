import { WorkflowBase } from "./workflow.base";
import { EventBus } from "../events/mesh";
import { logger } from "@devbrand/telemetry";

export interface BulkIngestInput {
  repoUrls: string[];
  userId: string;
}

/**
 * ELITE ARCHITECTURE: Bulk Ingestion Workflow.
 * Fans out repo ingestion tasks with backpressure and priority queuing.
 */
export class BulkIngestWorkflow extends WorkflowBase<BulkIngestInput, { total: number }> {
  public id = "workflow.bulk_ingest";

  async execute(input: BulkIngestInput) {
    const { repoUrls, userId } = input;
    const bus = EventBus.getInstance();

    logger.info(`Starting bulk ingestion for ${repoUrls.length} repositories`, { userId });

    // Chunking to avoid overwhelming the event bus or hitting DB connection limits
    const CHUNK_SIZE = 10;
    for (let i = 0; i < repoUrls.length; i += CHUNK_SIZE) {
      const chunk = repoUrls.slice(i, i + CHUNK_SIZE);
      
      await Promise.all(chunk.map(async (url) => {
        await bus.publish({
          type: "REPO_INGESTION_REQUESTED",
          payload: {
            url,
            userId,
            priority: "low", // Bulk ingestion is usually background
            timestamp: Date.now(),
          },
        });
      }));

      logger.info(`Enqueued chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(repoUrls.length / CHUNK_SIZE)}`, { 
        count: chunk.length 
      });
      
      // Artificial delay to allow workers to pick up tasks without a thundering herd
      await new Promise(r => setTimeout(r, 500));
    }

    return { total: repoUrls.length };
  }
}
