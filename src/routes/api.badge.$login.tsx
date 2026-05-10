import { createFileRoute } from "@tanstack/react-router";
import { getBadgeData } from "@/rpc.server";

export const Route = createFileRoute("/api/badge/$login")({
  loader: async ({ params }) => {
    const data = await getBadgeData({ data: params.login });

    if (!data) {
      return new Response("User not found", { status: 404 });
    }

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

    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  },
});
