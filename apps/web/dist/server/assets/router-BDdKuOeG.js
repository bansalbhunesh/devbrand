import { Link, createRootRoute, useLocation, Outlet, HeadContent, ScrollRestoration, Scripts, createFileRoute, lazyRouteComponent, createRouter as createRouter$1 } from "@tanstack/react-router";
import { jsxs, jsx } from "react/jsx-runtime";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Toaster } from "sonner";
import * as React from "react";
import { useState, useEffect } from "react";
import Lenis from "lenis";
import { X, Github, Menu } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";
import { AnimatePresence, motion } from "framer-motion";
import { T as TSS_SERVER_FUNCTION, e as getServerFnById, c as createServerFn } from "../server.js";
function SmoothScroll() {
  React.useEffect(() => {
    const mq = window.matchMedia(
      "(prefers-reduced-motion: reduce), (pointer: coarse)"
    );
    if (mq.matches) return;
    const lenis = new Lenis({
      // Easing curve: aggressive at start, glides to a stop. Matches the
      // cinematic ease used elsewhere in the site (Reveal: 0.16, 1, 0.3, 1).
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Wheel inertia. Higher = more glide. 1.2 reads as "premium drift"
      // without feeling laggy when the user wants to jump fast.
      lerp: 0.1,
      duration: 1.2,
      // Don't hijack horizontal — overflow:auto containers should keep
      // their native behaviour (e.g. the admin command center chart row).
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true
    });
    let rafId = 0;
    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
  return null;
}
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetPortal = SheetPrimitive.Portal;
const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Overlay,
  {
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props,
    ref
  }
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
      }
    },
    defaultVariants: {
      side: "right"
    }
  }
);
const SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SheetPortal, { children: [
  /* @__PURE__ */ jsx(SheetOverlay, {}),
  /* @__PURE__ */ jsxs(
    SheetPrimitive.Content,
    {
      ref,
      className: cn(sheetVariants({ side }), className),
      ...props,
      children: [
        /* @__PURE__ */ jsxs(SheetPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary", children: [
          /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
        ] }),
        children
      ]
    }
  )
] }));
SheetContent.displayName = SheetPrimitive.Content.displayName;
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Title,
  {
    ref,
    className: cn("text-lg font-semibold text-foreground", className),
    ...props
  }
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return /* @__PURE__ */ jsx(
    "nav",
    {
      className: cn(
        "fixed left-0 right-0 z-[100] transition-all duration-500 ease-[0.22,1,0.36,1]",
        scrolled ? "top-4" : "top-0"
      ),
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          className: cn(
            "mx-auto transition-all duration-500 ease-[0.22,1,0.36,1] flex items-center justify-between",
            scrolled ? "glass-morphism py-2 px-6 rounded-full w-fit gap-8 shadow-2xl shadow-black/60 border-white/10" : "w-full max-w-7xl px-8 py-8 border-b border-transparent"
          ),
          children: [
            /* @__PURE__ */ jsxs(Link, { to: "/", className: "flex items-center gap-2.5 group shrink-0", children: [
              /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center ring-soft group-hover:scale-105 transition", children: /* @__PURE__ */ jsx("span", { className: "text-[12px] font-bold text-white", children: "DB" }) }),
              !scrolled && /* @__PURE__ */ jsx("span", { className: "font-semibold tracking-tight text-lg", children: "DevBrand" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-muted-foreground", children: /* @__PURE__ */ jsx(Link, { to: "/", className: "hover:text-foreground transition", children: "Home" }) }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 shrink-0", children: [
              /* @__PURE__ */ jsxs(
                "a",
                {
                  href: "https://github.com/bansalbhunesh/devbrand",
                  target: "_blank",
                  rel: "noreferrer",
                  className: "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 transition shadow-lg shadow-foreground/10",
                  children: [
                    /* @__PURE__ */ jsx(Github, { className: "h-3.5 w-3.5" }),
                    !scrolled && "View Source"
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(Sheet, { children: [
                /* @__PURE__ */ jsx(SheetTrigger, { asChild: true, children: /* @__PURE__ */ jsx("button", { className: "md:hidden p-2 text-muted-foreground hover:text-foreground transition", children: /* @__PURE__ */ jsx(Menu, { className: "h-5 w-5" }) }) }),
                /* @__PURE__ */ jsx(
                  SheetContent,
                  {
                    side: "right",
                    className: "bg-background/95 backdrop-blur-xl border-border",
                    children: /* @__PURE__ */ jsx("div", { className: "flex flex-col gap-6 mt-12", children: /* @__PURE__ */ jsx(
                      Link,
                      {
                        to: "/",
                        className: "text-lg font-medium hover:text-blue-500 transition",
                        children: "Home"
                      }
                    ) })
                  }
                )
              ] })
            ] })
          ]
        }
      )
    }
  );
}
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 3e4
    }
  }
});
const Route$1 = createRootRoute({
  loader: async () => {
    return { session: null };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=5" },
      { title: "DevBrand — Make invisible engineering work visible" },
      {
        name: "description",
        content: "GitHub to LinkedIn posts and resume bullets automatically. Turn your PRs into verifiable career leverage. No hype. No emoji."
      },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "robots", content: "index, follow" },
      { name: "author", content: "DevBrand" },
      { name: "keywords", content: "developer reputation, github portfolio, pull request analysis, engineering blog generator, automated changelog, software engineering career" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "DevBrand" },
      {
        property: "og:title",
        content: "DevBrand — Evidence-Backed Engineering Reputation"
      },
      {
        property: "og:description",
        content: "Turn your PRs into verifiable career leverage. Evidence citations included. Build quietly. Compound publicly."
      },
      { property: "og:image", content: "https://devbrand.ai/og-main.png" },
      { property: "og:url", content: "https://devbrand.ai" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@devbrand_ai" },
      { name: "twitter:creator", content: "@devbrand_ai" },
      { name: "twitter:title", content: "DevBrand — Make invisible engineering work visible" },
      { name: "twitter:description", content: "Turn your PRs into verifiable career leverage. Evidence citations included." },
      { name: "twitter:image", content: "https://devbrand.ai/og-main.png" }
    ],
    links: [
      { rel: "canonical", href: "https://devbrand.ai" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
      }
    ]
  }),
  errorComponent: (props) => {
    return /* @__PURE__ */ jsx(RootDocument, { children: /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-background grid place-items-center p-6 text-center", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md", children: [
      /* @__PURE__ */ jsx("div", { className: "h-16 w-16 bg-red-500/10 rounded-2xl grid place-items-center mx-auto mb-8", children: /* @__PURE__ */ jsx("span", { className: "text-2xl", children: "💀" }) }),
      /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold tracking-tight mb-4", children: "Internal System Collapse." }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mb-8 leading-relaxed", children: "Our AI either found a bug it couldn't roast, or the server decided to retire early. Either way, it's not looking good for your PR." }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => window.location.reload(),
          className: "px-6 py-3 rounded-xl bg-foreground text-background font-bold hover:opacity-90 transition",
          children: "Try to recover"
        }
      ),
      /* @__PURE__ */ jsx("pre", { className: "mt-12 p-4 rounded-lg bg-muted text-[10px] font-mono text-left overflow-auto border border-border opacity-50", children: props.error?.message })
    ] }) }) });
  },
  notFoundComponent: () => {
    return /* @__PURE__ */ jsx(RootDocument, { children: /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-background grid place-items-center p-6 text-center", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md", children: [
      /* @__PURE__ */ jsx("div", { className: "h-16 w-16 bg-blue-500/10 rounded-2xl grid place-items-center mx-auto mb-8", children: /* @__PURE__ */ jsx("span", { className: "text-2xl", children: "🔍" }) }),
      /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold tracking-tight mb-4", children: "Impact Not Found." }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mb-8 leading-relaxed", children: "We looked through the git logs and found nothing here. Just like that refactoring ticket you said you finished last week." }),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "/",
          className: "px-6 py-3 rounded-xl bg-blue-500 text-white font-bold hover:opacity-90 transition inline-block",
          children: "Back to Registry"
        }
      )
    ] }) }) });
  },
  component: RootComponent
});
const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "DevBrand",
  operatingSystem: "Web",
  applicationCategory: "BusinessApplication",
  description: "Turn invisible engineering work into verifiable career leverage with AI-powered PR analysis and evidence-backed reputation scoring.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD"
  }
};
function RootComponent() {
  const location = useLocation();
  return /* @__PURE__ */ jsx(RootDocument, { children: /* @__PURE__ */ jsxs(QueryClientProvider, { client: queryClient, children: [
    /* @__PURE__ */ jsx(SmoothScroll, {}),
    /* @__PURE__ */ jsx(Nav, {}),
    /* @__PURE__ */ jsx(AnimatePresence, { mode: "wait", children: /* @__PURE__ */ jsx(
      motion.div,
      {
        initial: { opacity: 0, scale: 0.985, filter: "blur(10px)" },
        animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 1.02, filter: "blur(10px)" },
        transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
        className: "w-full relative",
        style: { willChange: "transform, filter, opacity" },
        children: /* @__PURE__ */ jsx(Outlet, {})
      },
      location.pathname
    ) }),
    /* @__PURE__ */ jsx(Toaster, { theme: "dark", position: "bottom-right", richColors: true })
  ] }) });
}
function RootDocument({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx(HeadContent, {}),
      /* @__PURE__ */ jsx(
        "script",
        {
          type: "application/ld+json",
          dangerouslySetInnerHTML: { __html: JSON.stringify(STRUCTURED_DATA) }
        }
      ),
      /* @__PURE__ */ jsx("script", { src: "https://checkout.razorpay.com/v1/checkout.js", async: true })
    ] }),
    /* @__PURE__ */ jsxs("body", { className: "antialiased selection:bg-blue-500/30 selection:text-blue-200 relative", children: [
      /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-noise pointer-events-none z-[9999]" }),
      /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-mesh-complex pointer-events-none -z-10" }),
      children,
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
var createSsrRpc = (functionId) => {
  const url = "/_serverFn/" + functionId;
  const serverFnMeta = { id: functionId };
  const fn = async (...args) => {
    return (await getServerFnById(functionId))(...args);
  };
  return Object.assign(fn, {
    url,
    serverFnMeta,
    [TSS_SERVER_FUNCTION]: true
  });
};
const getAuthState = createServerFn({
  method: "GET"
}).handler(createSsrRpc("9f7d480fccb61bf3ac1ee08f0ec76f8262b96390e23367d8f074cc12e341e11f"));
const getAuthUrl = createServerFn({
  method: "GET"
}).handler(createSsrRpc("f1ca2137178ed27584cb567e9926f70c9a6e653517f8af033f288518c696c71d"));
const exchangeAuthCode = createServerFn({
  method: "POST"
}).validator((code) => code).handler(createSsrRpc("dadc6dbc10c65ea008c090c745f5d2f061493afb1504a70e981a54581956c944"));
const logout = createServerFn({
  method: "POST"
}).handler(createSsrRpc("f71d5c4629376acb5d7f7da88c971fa571331021fe87fdabe25085cb0151d808"));
const generatePost = createServerFn({
  method: "POST"
}).validator((prUrl) => prUrl).handler(createSsrRpc("8ba2ee828bb464bc80637073e31da3273384ed5ae47152bfc586d5ccf7173a48"));
const $$splitComponentImporter = () => import("./index-CdPuyd_p.js");
const Route = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter, "component"),
  loader: async () => {
    return await getAuthState();
  }
});
const IndexRoute = Route.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$1
});
const rootRouteChildren = {
  IndexRoute
};
const routeTree = Route$1._addFileChildren(rootRouteChildren)._addFileTypes();
function createRouter() {
  return createRouter$1({
    routeTree,
    defaultPreload: "intent"
  });
}
function getRouter() {
  return createRouter();
}
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  createRouter,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Route as R,
  getAuthUrl as a,
  exchangeAuthCode as e,
  generatePost as g,
  logout as l,
  router as r
};
