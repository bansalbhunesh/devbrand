import { createFileRoute } from "@tanstack/react-router";

/**
 * GitHub merge-event webhook. Lives at /webhooks/github (NO `/api/` prefix)
 * because vercel.json's catch-all rewrite excludes `api/` paths, and we want
 * the same handler to fire in both dev (vite) and prod (Vercel SSR).
 *
 * Uses TanStack Start's `server.handlers` API so the POST handler is wired
 * by the same routing layer that handles every other request, in both vite
 * dev and Vercel prod identically. The default-export interception in
 * src/ssr.tsx only runs in prod and is the wrong layer for this.
 */
export const Route = createFileRoute("/webhooks/github")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const signature = request.headers.get("x-hub-signature-256");
          const deliveryId = request.headers.get("x-github-delivery");
          const event = request.headers.get("x-github-event");
          // Raw body bytes — HMAC is computed over the exact text GitHub
          // sent. JSON.parse-then-stringify would re-order keys and break
          // signature verification.
          const rawBody = await request.text();

          const { processGithubWebhookRaw } =
            await import("@/server/webhooks.server");
          const result = await processGithubWebhookRaw(rawBody, {
            signature,
            deliveryId,
            event,
          });

          // Status mapping — chosen so GitHub does NOT retry outcomes we
          // already finalised in the database. Only the catch block returns
          // 5xx, which GitHub will retry over the next 8 hours.
          const httpStatus = (() => {
            switch (result.status) {
              case "enqueued":
                return 202;
              case "duplicate":
              case "filtered":
              case "no_subscribers":
                return 200;
              case "invalid_sig":
                return 401;
              case "malformed":
                return 400;
              default:
                return 200;
            }
          })();

          return new Response(JSON.stringify(result), {
            status: httpStatus,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("github_webhook_failure", error);
          return new Response(JSON.stringify({ error: "WEBHOOK_FAILED" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
