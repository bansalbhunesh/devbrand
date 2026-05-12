import { createFileRoute } from "@tanstack/react-router";

/**
 * Vercel Cron drain endpoint. Triggered once a minute (see vercel.json
 * `crons`). Vercel cron requests use the `vercel-cron/1.0` user-agent; we
 * accept that OR an explicit CRON_SECRET Bearer for manual triggering
 * during dev/staging.
 *
 * Path lives at /internal/cron/drain (not under /api/) so the same Vercel
 * SSR rewrite that handles /webhooks/github also handles this one.
 */
export const Route = createFileRoute("/internal/cron/drain")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const cronSecret = process.env.CRON_SECRET;
        const ua = request.headers.get("user-agent") ?? "";
        const isVercelCron = ua.startsWith("vercel-cron");
        const isAuthorized =
          isVercelCron || (cronSecret && auth === `Bearer ${cronSecret}`);
        if (!isAuthorized) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { drainQueueTick } = await import("@/server/jobs.server");
          const result = await drainQueueTick(3);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("cron_drain_failure", error);
          return new Response(JSON.stringify({ error: "DRAIN_FAILED" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
