import { EventBus } from "../events/mesh";
import { ingestAndPreprocessPR } from "@devbrand/repo-intelligence";
import { logger } from "@devbrand/telemetry";

/**
 * ELITE ARCHITECTURE: Repo Ingestion Listener.
 * Reacts to REPO_INGESTION_REQUESTED events by triggering the analysis pipeline.
 */
export class RepoIngestListener {
  constructor(private bus: EventBus) {}

  public init() {
    this.bus.on("REPO_INGESTION_REQUESTED", async (payload) => {
      const { url, userId } = payload;
      
      logger.info(`[IngestListener] Starting ingestion for ${url}`, { userId });

      try {
        // Layer 0: Ingestion & Preprocessing
        // This is where the heavy lifting (cloning, AST parsing) happens.
        await ingestAndPreprocessPR(url);
        
        logger.info(`[IngestListener] Successfully ingested ${url}`, { userId });

        // Enqueue next step: Analysis
        await this.bus.emit({
          type: "repo.registered", // Or a new analysis-requested event
          payload: {
            repoId: url, // Using URL as ID for now
            userId,
            url,
          }
        });

      } catch (err: any) {
        logger.error(`[IngestListener] Ingestion failed for ${url}`, { 
          userId, 
          error: err.message 
        });
        // In a real system, we'd emit an 'ingestion.failed' event here
      }
    });
  }
}
