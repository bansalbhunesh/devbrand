import { db } from "@infrastructure/database/db.server";
import { backgroundJobs } from "@infrastructure/database/schema.server";
import { eq, and, or, lt } from "drizzle-orm";
import { WorkflowRegistry } from "./workflow.registry";
import { EventBus } from "../events/event-bus";

export class BackgroundWorker {
  constructor(
    private registry: WorkflowRegistry,
    private eventBus: EventBus
  ) {}

  async processNextJob() {
    const [job] = await db
      .select()
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.status, "PENDING"),
          or(
            eq(backgroundJobs.scheduledFor, null as any),
            lt(backgroundJobs.scheduledFor, new Date())
          )
        )
      )
      .limit(1);

    if (!job) return false;

    console.log(`[Worker] Picking up job: ${job.type} (${job.id})`);
    const workflow = this.registry.getWorkflow(job.type, this.eventBus);
    
    if (!workflow) {
      console.error(`[Worker] No workflow registered for type: ${job.type}`);
      await db.update(backgroundJobs).set({ status: "FAILED", error: "UNREGISTERED_WORKFLOW" }).where(eq(backgroundJobs.id, job.id));
      return true;
    }

    try {
      await workflow.run(job.payload, { userId: job.userId!, jobId: job.id });
    } catch (err) {
      console.error(`[Worker] Job ${job.id} failed:`, err);
    }

    return true;
  }

  // Poll for jobs (used in non-serverless envs)
  startPolling(intervalMs = 5000) {
    console.log("[Worker] Started polling for jobs...");
    setInterval(async () => {
      try {
        let processed = true;
        while (processed) {
          processed = await this.processNextJob();
        }
      } catch (err) {
        console.error("[Worker] Polling error:", err);
      }
    }, intervalMs);
  }
}
