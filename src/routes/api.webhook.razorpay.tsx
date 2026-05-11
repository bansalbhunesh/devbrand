import { createAPIFileRoute } from "@tanstack/react-start/api";
import { handleRazorpayWebhook } from "@/server/billing";

export const Route = createAPIFileRoute("/api/webhook/razorpay")({
  POST: async ({ request }) => {
    const signature = request.headers.get("x-razorpay-signature") || "";
    const body = await request.json();

    try {
      await handleRazorpayWebhook({ data: { body, signature } });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("Webhook Error:", error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
});
