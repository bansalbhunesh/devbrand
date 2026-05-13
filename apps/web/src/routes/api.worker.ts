import { createAPIFileRoute } from "@tanstack/react-start/api";
import { WorkflowRegistry } from "@/modules/core/workflow/workflow.registry";
import { EventBus } from "@/modules/core/events/event-bus";
import { BackgroundWorker } from "@/modules/core/workflow/worker";
import { initWorkflows } from "@/modules/core/workflow/init-workflows";

// Ensure workflows are initialized
initWorkflows();

export const Route = createAPIFileRoute("/api/worker")({
  GET: async ({ request }) => {
    // This endpoint can be triggered by a Cron job or a "poke" from the RPC
    const registry = WorkflowRegistry.getInstance();
    const eventBus = EventBus.getInstance();
    const worker = new BackgroundWorker(registry, eventBus);

    console.log("[API Worker] Poke received. Processing jobs...");

    let jobsProcessed = 0;
    let processed = true;

    // Process a batch of jobs
    while (processed && jobsProcessed < 10) {
      processed = await worker.processNextJob();
      if (processed) jobsProcessed++;
    }

    return new Response(JSON.stringify({ success: true, jobsProcessed }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
