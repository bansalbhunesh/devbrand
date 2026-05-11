import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { handleRazorpayWebhook } from "./server/billing";

const handler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);

    // Handle Razorpay Webhook directly
    if (url.pathname === "/api/webhook/razorpay" && request.method === "POST") {
      const signature = request.headers.get("x-razorpay-signature") || "";
      try {
        const body = await request.json();
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
    }

    return handler(request, env, ctx);
  },
};
