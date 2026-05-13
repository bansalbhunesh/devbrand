import { WorkflowRegistry } from "./workflow.registry";
import { EventBus } from "../events/mesh";
import { BackgroundWorker } from "./worker";

// Import Workflows
import { BulkIngestWorkflow } from "./bulk-ingest";

// Import Listeners
import { RepoIngestListener } from "../events/ingest.listener";

/**
 * ELITE ARCHITECTURE: Global Workflow & Listener Initialization.
 */
export function initWorkflows() {
  const registry = WorkflowRegistry.getInstance();
  const eventBus = EventBus.getInstance();

  // Initialize Event Listeners (Reactive Domain Logic)
  new RepoIngestListener(eventBus).init();

  // Register Workflows (Orchestrated Domain Logic)
  registry.register("workflow.bulk_ingest", (eb) => new BulkIngestWorkflow(eb));

  // Start Background Worker if enabled
  if (process.env.ENABLE_WORKER === "true" || process.env.NODE_ENV === "production") {
    const worker = new BackgroundWorker(registry, eventBus);
    worker.startPolling();
  }

  console.log("[Workflows] System capability registry initialized.");
}
