import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { handleRazorpayWebhook } from "./server/billing";
import { createRouter } from "./router";
import "./rpc.server";
import { getBadgeData } from "./rpc.server";

// Standard framework handler (Lazy to avoid top-level evaluation crashes)
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
  // 1. Polyfill process.env for Cloudflare
  if (env && typeof env === "object") {
    Object.assign(process.env, env);
  }

  // 2. Extract and Normalize URL
  const rawUrl = request?.url || "";
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch (e) {
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
  try {
    const absoluteRequest = new Request(url.toString(), {
      method: request.method,
      headers: request.headers,
      body: (request.method !== 'GET' && request.method !== 'HEAD') ? (typeof request.arrayBuffer === 'function' ? await request.arrayBuffer() : request.body) : undefined,
      // @ts-ignore
      duplex: 'half',
    });
    
    return await getHandler()(absoluteRequest, env, ctx);
  } catch (error: any) {
    console.error("Framework Runtime Error:", error);
    return new Response(`SSR Runtime Error: ${error.message}`, { status: 500 });
  }
}

/**
 * Standard Cloudflare Module Worker export.
 */
export default {
  async fetch(request: any, env?: any, ctx?: any) {
    return unifiedFetch(request, env, ctx);
  }
};
