import { Queue, Worker, QueueEvents } from "bullmq";
import Redis from "ioredis";
import { logger } from "../../modules/core/logger";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const analysisQueue = new Queue("analysis-queue", { connection });
export const analysisQueueEvents = new QueueEvents("analysis-queue", { connection });

// Set up the worker for the analysis queue
export const analysisWorker = new Worker(
  "analysis-queue",
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, "Processing analysis job");
    
    // Simulate long-running AI task
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    return { status: "COMPLETED", message: "Analysis finished successfully" };
  },
  { connection }
);

analysisWorker.on("completed", (job, returnvalue) => {
  logger.info({ jobId: job.id, returnvalue }, "Job completed successfully");
});

analysisWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Job failed");
});
