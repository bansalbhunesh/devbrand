import { createAPIFileRoute } from "@tanstack/react-start/api";
import { generatePost } from "@/server/functions";

export const Route = createAPIFileRoute("/api/webhooks/github")({
  POST: async ({ request }) => {
    // 1. Verify GitHub webhook signature here (omitted for brevity)
    
    try {
      const body = await request.json();
      
      // We only care about PRs that are closed and merged
      if (body.action === "closed" && body.pull_request?.merged) {
        const prUrl = body.pull_request.html_url;
        console.log(`[Webhook] Processing merged PR: ${prUrl}`);
        
        // Since this is asynchronous background work, we might want to use QStash here in the future
        // For now, we will fire and forget the generation
        generatePost({ data: { prUrl } }).catch(err => {
          console.error(`[Webhook] Error processing PR: ${err.message}`);
        });
        
        return new Response(JSON.stringify({ received: true, processing: true }), {
          status: 202,
          headers: { "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400 });
    }
  }
});
