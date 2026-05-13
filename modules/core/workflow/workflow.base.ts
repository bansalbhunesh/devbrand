import { EventBus } from "../events/mesh";

export interface WorkflowContext {
  userId: string;
  jobId: string;
}

/**
 * ELITE ARCHITECTURE: The Workflow Base.
 * Provides standard lifecycle methods for all domain workflows.
 */
export abstract class WorkflowBase<TInput, TOutput> {
  public abstract id: string;

  constructor(protected eventBus: EventBus = EventBus.getInstance()) {}

  async run(input: TInput, context: WorkflowContext): Promise<TOutput> {
    try {
      logger.info(`[Workflow:${this.id}] Starting`, { jobId: context.jobId });
      const result = await this.execute(input, context);
      logger.info(`[Workflow:${this.id}] Completed`, { jobId: context.jobId });
      return result;
    } catch (err: any) {
      logger.error(`[Workflow:${this.id}] Failed`, { jobId: context.jobId, error: err.message });
      throw err;
    }
  }

  protected abstract execute(
    input: TInput,
    context: WorkflowContext,
  ): Promise<TOutput>;
}

// Minimal logger if telemetry is not yet initialized in the script environment
const logger = {
  info: (msg: string, meta?: any) => console.log(`[INFO] ${msg}`, meta || ""),
  error: (msg: string, meta?: any) => console.error(`[ERROR] ${msg}`, meta || ""),
  warn: (msg: string, meta?: any) => console.warn(`[WARN] ${msg}`, meta || ""),
};
