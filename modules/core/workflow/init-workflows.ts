import { WorkflowRegistry } from "./workflow.registry";
import { EventBus } from "../events/event-bus";
import { BackgroundWorker } from "./worker";

// Import Workflows
import { TransformWorkflow } from "@/modules/transform/application/transform.workflow";
import { EngineWorkflow } from "@/modules/ai/application/engine.workflow";

// Import Listeners
import { NotificationListener } from "@/modules/notifications/application/notification.listener";

export function initWorkflows() {
  const registry = WorkflowRegistry.getInstance();
  const eventBus = EventBus.getInstance();

  // Initialize Listeners
  new NotificationListener(eventBus).init();

  // Register Transform
  registry.register("transform_pr", (eb) => {
    const { DrizzleTransformRepository } = require("@/modules/transform/infrastructure/drizzle-transform.repository");
    const engineWorkflow = new EngineWorkflow(eb);
    return new TransformWorkflow(eb, engineWorkflow, new DrizzleTransformRepository());
  });

  // Start Worker (only in production or a dedicated process)
  if (process.env.NODE_ENV === "production" || process.env.ENABLE_WORKER === "true") {
    const worker = new BackgroundWorker(registry, eventBus);
    worker.startPolling();
  }

  console.log("[Workflows] Initialized and registered.");
}
