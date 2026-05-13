import { WorkflowBase, WorkflowContext } from "./workflow.base";
import { WorkflowRegistry } from "./workflow.registry";
import { EventBus } from "../events/mesh";

/**
 * ELITE ARCHITECTURE: The Workflow Engine.
 * Orchestrates the execution of registered workflows.
 */
export class WorkflowEngine {
  private registry = WorkflowRegistry.getInstance();
  private eventBus = EventBus.getInstance();

  /**
   * Execute a workflow by its registered type.
   */
  async executeByType(type: string, input: any, context: Omit<WorkflowContext, "jobId">) {
    const workflow = this.registry.getWorkflow(type, this.eventBus);
    if (!workflow) {
      throw new Error(`No workflow registered for type: ${type}`);
    }

    const jobId = `job_${Math.random().toString(36).slice(2, 11)}`;
    return await workflow.run(input, { ...context, jobId });
  }

  /**
   * Execute a specific workflow instance directly (useful for scripts/testing).
   */
  async execute<I, O>(workflow: WorkflowBase<I, O>, input: I, context: Omit<WorkflowContext, "jobId"> = { userId: "system" }) {
    const jobId = `job_direct_${Math.random().toString(36).slice(2, 11)}`;
    return await workflow.run(input, { ...context, jobId });
  }
}
