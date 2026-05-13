import { createFileRoute } from "@tanstack/react-router";

/**
 * Razorpay billing webhook. Migrated from the default-export wrapper in
 * src/ssr.tsx — that wrapper only fires in production AND its old path
 * `/api/webhook/razorpay` falls through vercel.json's `api/` exclusion to
 * Vercel's file routing, where no `api/webhook/razorpay.ts` exists. Net
 * effect: the old route was a 404 in dev AND prod.
 *
 * New path: `/webhooks/razorpay` — matches the same rewrite that handles
 * `/webhooks/github` and `/internal/cron/drain`, fires in dev + prod
 * identically.
 *
 * ACTION REQUIRED after this lands: update the webhook URL in the Razorpay
 * dashboard from `/api/webhook/razorpay` to `/webhooks/razorpay`.
 */
export const Route = createFileRoute("/webhooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const signature =
            request.headers.get("x-razorpay-signature")?.trim() ?? "";
          // Raw body bytes — HMAC is computed over the exact text Razorpay
          // sent. Re-stringifying after JSON.parse would re-order keys and
          // break signature verification.
          const rawBody = await request.text();

          const { processRazorpayWebhookRaw } =
            await import("@/server/webhooks.server");
          await processRazorpayWebhookRaw(rawBody, signature);

          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("razorpay_webhook_failure", error);
          return new Response(JSON.stringify({ error: "WEBHOOK_FAILED" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
