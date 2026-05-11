import { handleRazorpayWebhook } from "./server/billing";
import { getEnv } from "./lib/env";

/**
 * PRODUCTION-READY SERVER ENTRY
 * Handles lazy initialization, environment polyfilling, and defensive request normalization.
 */

let _handler: any;
async function getHandler(env: any) {
  if (!_handler) {
    // 1. Validate environment before any framework logic evaluates
    getEnv(env);

    // 2. Defer framework evaluation until env is ready
    const { createStartHandler, defaultStreamHandler } = await import("@tanstack/react-start/server");
    const { createRouter } = await import("./router");
    await import("./rpc.server"); // Register RPCs
    
    _handler = createStartHandler({
      createRouter,
    })(defaultStreamHandler);
  }
  return _handler;
}

/**
 * Unified fetch handler with explicit error boundaries.
 */
async function unifiedFetch(request: any, env?: any, ctx?: any) {
  try {
    // 1. Populate process.env for compatibility with legacy libraries
    if (env && typeof env === "object") {
      Object.assign(process.env, env);
    }

    // 2. Normalize and Validate Configuration
    const validatedEnv = getEnv(env);
    
    // Ensure the framework has the correct base URL
    const url = new URL(request.url);
    if (!process.env.APP_URL) {
      process.env.APP_URL = validatedEnv.APP_URL;
    }

    const { pathname } = url;

    // 3. Resilient API Route Handling
    if (pathname === "/api/webhook/razorpay" && request?.method === "POST") {
      try {
        const signature = (request.headers.get?.("x-razorpay-signature")) || (request.headers?.["x-razorpay-signature"]) || "";
        const body = typeof request.json === 'function' ? await request.json() : request.body;
        await handleRazorpayWebhook({ data: { body, signature } });
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      } catch (error: any) {
        console.error("Webhook Failure:", error);
        return new Response(JSON.stringify({ error: "WEBHOOK_VERIFICATION_FAILED" }), { status: 400 });
      }
    }

    // 4. Delegate to Framework
    const handler = await getHandler(env);
    return await handler(request, env, ctx);

  } catch (error: any) {
    // PRODUCTION ERROR BOUNDARY
    console.error("CRITICAL_SSR_CRASH:", error);
    
    // In production, we provide a clean, secure error message.
    return new Response(
      `SSR_UNSTABLE: ${process.env.NODE_ENV === 'production' ? 'Internal Server Error' : error.message}`,
      { 
        status: 500, 
        headers: { "Content-Type": "text/plain", "X-Debug-Source": "unifiedFetch" } 
      }
    );
  }
}

export default {
  async fetch(request: any, env?: any, ctx?: any) {
    return unifiedFetch(request, env, ctx);
  }
};
export const fetch = unifiedFetch; // Keep hybrid export for maximum compatibility
