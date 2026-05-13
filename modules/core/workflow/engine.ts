import { db } from "@infrastructure/database/db.server";
import { backgroundJobs } from "@infrastructure/database/schema.server";
import { eq } from "drizzle-orm";
import { mesh } from "../events/mesh";

/**
 * ELITE ARCHITECTURE: The Workflow Core.
 * Workflows are resumable, stateful processes that orchestrate capabilities across domains.
 */

export interface WorkflowContext {
  jobId: string;
  userId: string;
  payload: any;
}

export abstract class Workflow<TState extends string> {
  constructor(protected ctx: WorkflowContext) {}

  /**
   * Transition the workflow to a new state.
   * This is atomic and persistent.
   */
  protected async transition(from: TState, to: TState) {
    console.log(`[Workflow:${this.ctx.jobId}] ${from} -> ${to}`);

    await db
      .update(backgroundJobs)
      .set({
        status: to === "COMPLETED" ? "COMPLETED" : "PROCESSING",
        updatedAt: new Date(),
      })
      .where(eq(backgroundJobs.id, this.ctx.jobId));

    // Emit to mesh for reactive monitoring/logging
    await mesh.emit({
      type: "workflow.state_changed",
      payload: {
        workflowId: this.ctx.jobId,
        from,
        to,
      },
    });
  }

  /**
   * Execute the workflow logic.
   */
  abstract execute(): Promise<void>;
}

/**
 * Registry to map job types to workflow implementations.
 */
const workflowRegistry: Map<string, new (ctx: WorkflowContext) => Workflow<any>> = new Map();

export function registerWorkflow(
  type: string,
  ctor: new (ctx: WorkflowContext) => Workflow<any>,
) {
  workflowRegistry.set(type, ctor);
}

export async function runWorkflow(type: string, ctx: WorkflowContext) {
  const Ctor = workflowRegistry.get(type);
  if (!Ctor) {
    throw new Error(`[WorkflowCore] No workflow registered for type: ${type}`);
  }

  const wf = new Ctor(ctx);
  try {
    await wf.execute();
  } catch (err) {
    console.error(`[WorkflowCore] Workflow ${type} failed:`, err);
    await db
      .update(backgroundJobs)
      .set({
        status: "FAILED",
        updatedAt: new Date(),
      })
      .where(eq(backgroundJobs.id, ctx.jobId));
    throw err;
  }
}
