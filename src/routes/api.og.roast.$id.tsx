import { createFileRoute } from "@tanstack/react-router";
import { db } from "@/server/db";
import { roasts } from "@/server/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/og/roast/$id")({
  loader: async ({ params }) => {
    const roast = await db.query.roasts.findFirst({
      where: eq(roasts.id, params.id),
    });

    if (!roast) {
      return new Response("Not Found", { status: 404 });
    }

    const data = roast.roastData as any;
    const score = data.roast_score || 0;
    const criticality = data.criticality || "MEDIUM";
    const color = criticality === "NUCLEAR" ? "#ef4444" : "#f97316";

    const svg = `
      <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="630" fill="#09090b"/>
        
        <!-- Gradient Background -->
        <defs>
          <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="80%" fy="20%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:0.15" />
            <stop offset="100%" style="stop-color:#09090b;stop-opacity:0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="630" fill="url(#grad1)"/>
        
        <!-- Frame -->
        <rect x="40" y="40" width="1120" height="550" rx="40" stroke="#27272a" stroke-width="2"/>
        
        <!-- Header -->
        <text x="80" y="110" fill="#a1a1aa" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="bold" letter-spacing="0.2em">DEVBRAND // CRITIC.AI</text>
        <rect x="980" y="80" width="140" height="40" rx="20" fill="${color}" />
        <text x="1050" y="106" fill="white" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="black" text-anchor="middle">${criticality}</text>
        
        <!-- Score Circle -->
        <circle cx="240" cy="340" r="120" stroke="#27272a" stroke-width="2" fill="#18181b"/>
        <text x="240" y="360" fill="white" font-family="Inter, system-ui, sans-serif" font-size="80" font-weight="black" text-anchor="middle">${score}%</text>
        <text x="240" y="400" fill="#a1a1aa" font-family="Inter, system-ui, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" letter-spacing="0.1em">HYPE LEVEL</text>
        
        <!-- Roast Content -->
        <text x="440" y="240" fill="${color}" font-family="Inter, system-ui, sans-serif" font-size="48" font-weight="black">${data.card_title || 'Sacrifice Detected'}</text>
        
        <foreignObject x="440" y="280" width="680" height="200">
          <div xmlns="http://www.w3.org/1999/xhtml" style="color: #d4d4d8; font-family: Inter, sans-serif; font-size: 24px; line-height: 1.6; font-style: italic;">
            "${data.roast?.slice(0, 200)}${data.roast?.length > 200 ? '...' : ''}"
          </div>
        </foreignObject>
        
        <!-- Footer -->
        <text x="440" y="520" fill="#71717a" font-family="monospace" font-size="16">VERIFIED EVIDENCE: ${roast.githubUsername}.json</text>
        <text x="1120" y="550" fill="#71717a" font-family="Inter, sans-serif" font-size="14" text-anchor="end">devbrand.ai/roast</text>
      </svg>
    `;

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400",
      },
    });
  },
});
