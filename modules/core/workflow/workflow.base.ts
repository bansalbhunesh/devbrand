import { db } from "@infrastructure/database/db.server";
import { backgroundJobs } from "@infrastructure/database/schema.server";
import { eq, sql } from "drizzle-orm";
import { EventBus } from "../events/event-bus";

export interface WorkflowContext {
  userId: string;
  jobId: string;
}

export abstract class Workflow<TInput, TOutput> {
  protected abstract name: string;

  constructor(protected eventBus: EventBus) {}

  async run(input: TInput, context: WorkflowContext): Promise<TOutput> {
    try {
      await this.updateStatus(context.jobId, "PROCESSING");

      const result = await this.execute(input, context);

      await this.updateStatus(context.jobId, "COMPLETED", result);
      return result;
    } catch (err: any) {
      await this.updateStatus(context.jobId, "FAILED", null, err.message);
      throw err;
    }
  }

  protected async updateStep(jobId: string, step: string) {
    console.log(`[Workflow] Job ${jobId} -> Step: ${step}`);
    await db
      .update(backgroundJobs)
      .set({
        payload: sql`${backgroundJobs.payload} || jsonb_build_object('currentStep', ${step})`,
        updatedAt: new Date(),
      })
      .where(eq(backgroundJobs.id, jobId));
  }

  protected abstract execute(
    input: TInput,
    context: WorkflowContext,
  ): Promise<TOutput>;

  private async updateStatus(
    jobId: string,
    status: string,
    result: any = null,
    error: string | null = null,
  ) {
    await db
      .update(backgroundJobs)
      .set({
        status: status as any,
        result: result as any,
        error,
        updatedAt: new Date(),
      })
      .where(eq(backgroundJobs.id, jobId));
  }
}
