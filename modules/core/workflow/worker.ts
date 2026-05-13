import { db } from "@infrastructure/database/db.server";
import { backgroundJobs } from "@infrastructure/database/schema.server";
import { eq, and, or, lt } from "drizzle-orm";
import { WorkflowRegistry } from "./workflow.registry";
import { EventBus } from "../events/mesh";
import { logger, trace } from "@devbrand/telemetry";

/**
 * ELITE ARCHITECTURE: The Production-Grade Background Worker.
 * Features: Concurrent execution, Telemetry, and Atomic State Transitions.
 */
export class BackgroundWorker {
  private isRunning = false;
  private maxConcurrency = 5;
  private activeJobs = 0;

  constructor(
    private registry: WorkflowRegistry,
    private eventBus: EventBus,
  ) {}

  async processNextJob() {
    if (this.activeJobs >= this.maxConcurrency) return false;

    const job = await db.transaction(async (tx) => {
      const [pendingJob] = await tx
        .select()
        .from(backgroundJobs)
        .where(
          and(
            eq(backgroundJobs.status, "PENDING"),
            or(
              eq(backgroundJobs.scheduledFor, null as any),
              lt(backgroundJobs.scheduledFor, new Date()),
            ),
          ),
        )
        .limit(1)
        .for("update", { skipLocked: true });

      if (!pendingJob) return null;

      await tx
        .update(backgroundJobs)
        .set({ status: "PROCESSING", updatedAt: new Date() })
        .where(eq(backgroundJobs.id, pendingJob.id));

      return pendingJob;
    });

    if (!job) return false;

    this.activeJobs++;
    
    // Execute asynchronously to maintain polling velocity
    this.runJob(job).finally(() => {
      this.activeJobs--;
    });

    return true;
  }

  private async runJob(job: any) {
    await trace(`worker.job:${job.type}`, async (span) => {
      logger.info(`[Worker] Executing ${job.type}`, { jobId: job.id });
      
      const workflow = this.registry.getWorkflow(job.type, this.eventBus);
      if (!workflow) {
        logger.error(`[Worker] Unregistered workflow: ${job.type}`, { jobId: job.id });
        await this.markFailed(job.id, "UNREGISTERED_WORKFLOW");
        return;
      }

      try {
        await workflow.run(job.payload, { userId: job.userId!, jobId: job.id });
        logger.info(`[Worker] Success: ${job.type}`, { jobId: job.id });
      } catch (err: any) {
        logger.error(`[Worker] Failed: ${job.type}`, { jobId: job.id, error: err.message });
        await this.markFailed(job.id, err.message);
      }
    });
  }

  private async markFailed(id: string, error: string) {
    await db
      .update(backgroundJobs)
      .set({ status: "FAILED", error, updatedAt: new Date() })
      .where(eq(backgroundJobs.id, id));
  }

  /**
   * Starts the worker polling loop.
   */
  startPolling(intervalMs = 2000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info("[Worker] Production loop started", { concurrency: this.maxConcurrency });

    const tick = async () => {
      try {
        let processed = true;
        while (processed && this.activeJobs < this.maxConcurrency) {
          processed = await this.processNextJob();
        }
      } catch (err) {
        logger.error("[Worker] Loop error", { error: err });
      }
      if (this.isRunning) setTimeout(tick, intervalMs);
    };

    tick();
  }

  stop() {
    this.isRunning = false;
    logger.info("[Worker] Shutdown initiated");
  }
}
