import { createRootRoute } from "@tanstack/react-router";
import { Outlet, ScrollRestoration } from "@tanstack/react-router";
import { Meta, Scripts } from "@tanstack/react-start";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import "@/styles.css";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DevBrand — Make invisible engineering work visible" },
      { name: "description", content: "GitHub → LinkedIn posts + resume bullets. No hype. No emoji." },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "DevBrand — Evidence-Backed Engineering Reputation" },
      { property: "og:description", content: "Turn your PRs into verifiable career leverage. Evidence citations included." },
      { property: "og:image", content: "https://devbrand.ai/og-main.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://devbrand.ai/og-main.png" },
    ],
    links: [
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" }
    ]
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Meta />
      </head>
      <body className="antialiased selection:bg-blue-500/30 selection:text-blue-200">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
