import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { getRouter } from "./router";
import { processRazorpayWebhookRaw } from "./server/webhooks.server";

const handler = createStartHandler({
  createRouter: getRouter,
  getStreamHandler: defaultStreamHandler,
});

export default async (request: Request, env?: unknown, ctx?: unknown) => {
  const url = new URL(request.url);
  
  // Handle Razorpay Webhook directly
  if (url.pathname === "/api/webhook/razorpay" && request.method === "POST") {
    try {
      const signature = request.headers.get("x-razorpay-signature")?.trim() ?? "";
      const rawBody = await request.text();
      await processRazorpayWebhookRaw(rawBody, signature);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      console.error("Webhook failure:", error);
      return new Response(JSON.stringify({ error: "WEBHOOK_FAILED" }), { status: 400 });
    }
  }

  // Fallback to standard TanStack Start handler
  return handler(request, env, ctx);
};
