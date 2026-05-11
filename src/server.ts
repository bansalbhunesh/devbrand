import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { handleRazorpayWebhook } from "./server/billing";
import { createRouter } from "./router";
import "./rpc.server";
import { getBadgeData } from "./rpc.server";

// Standard framework handler
let _handler: any;
function getHandler() {
  if (!_handler) {
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
    // 1. Polyfill process.env for Cloudflare
    if (env && typeof env === "object") {
      Object.assign(process.env, env);
    }

    // 2. Extract and Normalize URL
    // We use a very defensive approach here to identify what is causing the "Invalid URL string" error.
    let url: URL;
    const rawUrl = request?.url;
    
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new Error(`Request URL is missing or invalid: ${typeof rawUrl}`);
    }

    try {
      url = new URL(rawUrl);
    } catch (e) {
      // Fallback for relative URLs (common in some dev environments)
      const base = process.env.APP_URL || "http://localhost";
      const origin = base.startsWith("http") ? base : `https://${base}`;
      url = new URL(rawUrl, origin);
    }

    const { pathname } = url;

    // 3. Manual API Routes
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
        const data = await getBadgeData({ data: login });
        if (!data) return new Response("Not Found", { status: 404 });
        const svg = `<svg width="200" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="40" rx="8" fill="#09090b"/><text x="10" y="25" fill="#fff" font-family="sans-serif">${login}: ${data.score}%</text></svg>`;
        return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
      } catch (e) {
        return new Response("Error", { status: 500 });
      }
    }

    // 4. Delegate to TanStack Start
    // If the URL is already absolute (starts with http), we pass the original request
    // to avoid any potential cloning issues in the specific environment.
    const finalRequest = rawUrl.startsWith('http') ? request : new Request(url.toString(), request);
    
    return await getHandler()(finalRequest, env, ctx);

  } catch (error: any) {
    // Return detailed error info for debugging
    return new Response(
      `SSR Runtime Error: ${error.message}\nURL: ${request?.url}\nBase: ${process.env.APP_URL}`,
      { status: 500, headers: { "Content-Type": "text/plain" } }
    );
  }
}

export default {
  async fetch(request: any, env?: any, ctx?: any) {
    return unifiedFetch(request, env, ctx);
  }
};
