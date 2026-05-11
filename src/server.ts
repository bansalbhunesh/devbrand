import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { handleRazorpayWebhook } from "./server/billing";
import { getBadgeData, getOgRoastData } from "./rpc.server";

const handler = createStartHandler(defaultStreamHandler);

export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);

    // 1. Handle Razorpay Webhook
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
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
      }
    }

    // 2. Handle Badge API (/api/badge/$login)
    const badgeMatch = url.pathname.match(/^\/api\/badge\/(.+)$/);
    if (badgeMatch) {
      const login = badgeMatch[1];
      const data = await getBadgeData({ data: login });
      if (!data) return new Response("User not found", { status: 404 });

      const { score } = data;
      const level = score > 80 ? "Elite" : score > 50 ? "High" : "Verified";
      const color = score > 80 ? "#3b82f6" : "#6366f1";
      const svg = `
        <svg width="200" height="40" viewBox="0 0 200 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="200" height="40" rx="8" fill="#09090b" stroke="#27272a" stroke-width="1"/>
          <text x="12" y="24" fill="#a1a1aa" font-family="Inter, system-ui, sans-serif" font-size="10" font-weight="bold" letter-spacing="0.05em">DEVBRAND</text>
          <line x1="85" y1="12" x2="85" y2="28" stroke="#27272a" stroke-width="1"/>
          <text x="96" y="24" fill="#f4f4f5" font-family="Inter, system-ui, sans-serif" font-size="11" font-weight="bold">${level} · ${score}%</text>
          <circle cx="184" cy="20" r="4" fill="${color}">
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
      `;
      return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
    }

    // 3. Handle OG Roast API (/api/og/roast/$id)
    const ogMatch = url.pathname.match(/^\/api\/og\/roast\/(.+)$/);
    if (ogMatch) {
      const id = ogMatch[1];
      const roast = await getOgRoastData({ data: id });
      if (!roast) return new Response("Not Found", { status: 404 });

      const data = roast.roastData as any;
      const score = data.roast_score || 0;
      const criticality = data.criticality || "MEDIUM";
      const color = criticality === "NUCLEAR" ? "#ef4444" : "#f97316";
      const svg = `
        <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="1200" height="630" fill="#09090b"/>
          <rect width="1200" height="630" fill="url(#grad1)"/>
          <defs>
            <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="80%" fy="20%">
              <stop offset="0%" style="stop-color:${color};stop-opacity:0.15" />
              <stop offset="100%" style="stop-color:#09090b;stop-opacity:0" />
            </radialGradient>
          </defs>
          <rect x="40" y="40" width="1120" height="550" rx="40" stroke="#27272a" stroke-width="2"/>
          <text x="80" y="110" fill="#a1a1aa" font-family="Inter, sans-serif" font-size="20" font-weight="bold">DEVBRAND // CRITIC.AI</text>
          <text x="240" y="360" fill="white" font-family="Inter, sans-serif" font-size="80" font-weight="black" text-anchor="middle">${score}%</text>
          <text x="440" y="240" fill="${color}" font-family="Inter, sans-serif" font-size="48" font-weight="black">${data.card_title || 'Sacrifice Detected'}</text>
        </svg>
      `;
      return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
    }

    return handler(request, env, ctx);
  },
};
