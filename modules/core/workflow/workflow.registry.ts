import { WorkflowBase } from "./workflow.base";
import { EventBus } from "../events/mesh";

export class WorkflowRegistry {
  private static instance: WorkflowRegistry;
  private workflows: Map<string, (eventBus: EventBus) => WorkflowBase<any, any>> =
    new Map();

  private constructor() {}

  static getInstance(): WorkflowRegistry {
    if (!WorkflowRegistry.instance)
      WorkflowRegistry.instance = new WorkflowRegistry();
    return WorkflowRegistry.instance;
  }

  register(type: string, factory: (eventBus: EventBus) => WorkflowBase<any, any>) {
    this.workflows.set(type, factory);
  }

  getWorkflow(
    type: string,
    eventBus: EventBus,
  ): WorkflowBase<any, any> | undefined {
    const factory = this.workflows.get(type);
    return factory ? factory(eventBus) : undefined;
  }
}
