import {
  createRootRoute,
  Outlet,
  ScrollRestoration,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/styles.css";
import * as React from "react";
import { getSession } from "@/rpc";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export const Route = createRootRoute({
  loader: async () => {
    try {
      const session = await getSession();
      return { session };
    } catch (e) {
      console.error("root_loader_session_failed", e);
      return { session: null };
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DevBrand — Make invisible engineering work visible" },
      {
        name: "description",
        content: "GitHub → LinkedIn posts + resume bullets. No hype. No emoji.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "DevBrand" },
      {
        property: "og:title",
        content: "DevBrand — Evidence-Backed Engineering Reputation",
      },
      {
        property: "og:description",
        content:
          "Turn your PRs into verifiable career leverage. Evidence citations included.",
      },
      { property: "og:image", content: "https://devbrand.ai/og-main.png" },
      { property: "og:url", content: "https://devbrand.ai" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@devbrand_ai" },
      { name: "twitter:image", content: "https://devbrand.ai/og-main.png" },
    ],
    links: [
      { rel: "canonical", href: "https://devbrand.ai" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <div className="min-h-screen bg-background grid place-items-center p-6 text-center">
          <div className="max-w-md">
            <div className="h-16 w-16 bg-red-500/10 rounded-2xl grid place-items-center mx-auto mb-8">
              <span className="text-2xl">💀</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-4">
              Internal System Collapse.
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Our AI either found a bug it couldn't roast, or the server decided
              to retire early. Either way, it's not looking good for your PR.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl bg-foreground text-background font-bold hover:opacity-90 transition"
            >
              Try to recover
            </button>
            <pre className="mt-12 p-4 rounded-lg bg-muted text-[10px] font-mono text-left overflow-auto border border-border opacity-50">
              {props.error?.message}
            </pre>
          </div>
        </div>
      </RootDocument>
    );
  },
  notFoundComponent: () => {
    return (
      <RootDocument>
        <div className="min-h-screen bg-background grid place-items-center p-6 text-center">
          <div className="max-w-md">
            <div className="h-16 w-16 bg-blue-500/10 rounded-2xl grid place-items-center mx-auto mb-8">
              <span className="text-2xl">🔍</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-4">
              Impact Not Found.
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              We looked through the git logs and found nothing here. Just like
              that refactoring ticket you said you finished last week.
            </p>
            <a
              href="/"
              className="px-6 py-3 rounded-xl bg-blue-500 text-white font-bold hover:opacity-90 transition inline-block"
            >
              Back to Registry
            </a>
          </div>
        </div>
      </RootDocument>
    );
  },
  component: RootComponent,
});

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DevBrand",
  operatingSystem: "Web",
  applicationCategory: "BusinessApplication",
  description:
    "Turn invisible engineering work into verifiable career leverage with AI-powered PR analysis and evidence-backed reputation scoring.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

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
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>

      <body className="antialiased selection:bg-blue-500/30 selection:text-blue-200">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
