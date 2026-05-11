import { createAPIFileRoute } from "@tanstack/react-start/api";
import { processRazorpayWebhookRaw } from "@/server/billing";

export const Route = createAPIFileRoute("/api/webhook/razorpay")({
  POST: async ({ request }) => {
    try {
      const signature = request.headers.get("x-razorpay-signature")?.trim() ?? "";
      const rawBody = await request.text();
      
      await processRazorpayWebhookRaw(rawBody, signature);
      
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Webhook failure:", message);
      return new Response(
        JSON.stringify({ error: "WEBHOOK_VERIFICATION_FAILED" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
});
