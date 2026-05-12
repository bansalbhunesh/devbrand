import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

const handler = createStartHandler(defaultStreamHandler);

export default async (request: Request) => {
  const url = new URL(request.url);

  // Handle Razorpay Webhook directly with a dynamic import to avoid static scan issues
  if (url.pathname === "/api/webhook/razorpay" && request.method === "POST") {
    try {
      const signature =
        request.headers.get("x-razorpay-signature")?.trim() ?? "";
      const rawBody = await request.text();

      // Dynamic import ensures this server-only code is never seen by the shared bundler
      const { processRazorpayWebhookRaw } =
        await import("./server/webhooks.server");
      await processRazorpayWebhookRaw(rawBody, signature);

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: unknown) {
      console.error("Webhook failure:", error);
      return new Response(JSON.stringify({ error: "WEBHOOK_FAILED" }), {
        status: 400,
      });
    }
  }

  // Fallback to standard TanStack Start handler
  return handler(request);
};
