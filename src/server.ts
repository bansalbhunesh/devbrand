import { handleRazorpayWebhook } from "./server/billing";

// We use dynamic imports to ensure that framework code is only evaluated 
// AFTER we have polyfilled process.env with the Cloudflare environment variables.
let _handler: any;
async function getHandler() {
  if (!_handler) {
    // These imports trigger framework logic that accesses process.env
    const { createStartHandler, defaultStreamHandler } = await import("@tanstack/react-start/server");
    const { createRouter } = await import("./router");
    // Ensure RPCs are registered
    await import("./rpc.server");
    
    _handler = createStartHandler({
      createRouter,
    })(defaultStreamHandler);
  }
  return _handler;
}

/**
 * Unified fetch handler for both local development and Cloudflare production.
 */
async function unifiedFetch(request: any, env?: any, ctx?: any) {
  try {
    // 1. Polyfill process.env IMMEDIATELY
    // This must happen before any framework code is evaluated via dynamic imports.
    if (env && typeof env === "object") {
      Object.assign(process.env, env);
    }

    // 2. Extract and Normalize URL
    const url = new URL(request.url);
    if (!process.env.APP_URL) {
      process.env.APP_URL = url.origin;
    }

    const { pathname } = url;

    // 3. Manual API Routes (Handle before framework to avoid double-reading body)
    if (pathname === "/api/webhook/razorpay" && request?.method === "POST") {
      try {
        const signature = (request.headers.get?.("x-razorpay-signature")) || (request.headers?.["x-razorpay-signature"]) || "";
        const body = typeof request.json === 'function' ? await request.json() : request.body;
        await handleRazorpayWebhook({ data: { body, signature } });
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
      }
    }

    if (pathname.startsWith("/api/badge/")) {
      try {
        const login = pathname.split("/").pop() || "";
        // Note: we can't use top-level getBadgeData here because it's not imported yet.
        // But we can dynamically import it or use the rpc registration.
        const { getBadgeData } = await import("./rpc.server");
        const data = await getBadgeData({ data: login });
        if (!data) return new Response("Not Found", { status: 404 });
        const svg = `<svg width="200" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="40" rx="8" fill="#09090b"/><text x="10" y="25" fill="#fff" font-family="sans-serif">${login}: ${data.score}%</text></svg>`;
        return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
      } catch (e) {
        return new Response("Error", { status: 500 });
      }
    }

    // 4. Delegate to TanStack Start (Using lazy handler with dynamic imports)
    const handler = await getHandler();
    
    // Cloudflare natively provides absolute URLs, but we ensure string type to be safe.
    return await handler(request, env, ctx);

  } catch (error: any) {
    // Final defensive fallback
    return new Response(
      `SSR Runtime Error: ${error.message}\nURL: ${request?.url}\nAPP_URL: ${process.env.APP_URL}`,
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }
}

export default {
  async fetch(request: any, env?: any, ctx?: any) {
    return unifiedFetch(request, env, ctx);
  }
};
