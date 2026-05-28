import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Github, Twitter, Linkedin, Gavel, ArrowRight, CheckCircle2, Flame, Copy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { R as Route, e as exchangeAuthCode, g as generatePost, l as logout, a as getAuthUrl } from "./router-BRIyEqcQ.js";
import "@tanstack/react-query";
import "sonner";
import "lenis";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-dialog";
import "class-variance-authority";
import "../server.js";
import "node:async_hooks";
import "node:stream";
import "@tanstack/react-router/ssr/server";
function Footer() {
  return /* @__PURE__ */ jsxs("footer", { className: "relative border-t border-border bg-background pt-20", children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto max-w-7xl px-6 pb-20", children: /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-16", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 mb-6", children: [
          /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center shadow-lg shadow-blue-500/20", children: /* @__PURE__ */ jsx("span", { className: "text-[12px] font-bold text-white", children: "DB" }) }),
          /* @__PURE__ */ jsx("span", { className: "font-bold text-lg tracking-tight", children: "DevBrand" })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground leading-relaxed max-w-xs mb-8", children: "The reputation layer for modern software engineers. We turn complex technical artifacts into verifiable career leverage." }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-5 text-muted-foreground", children: [
          /* @__PURE__ */ jsx(
            "a",
            {
              href: "https://github.com/devbrand",
              className: "hover:text-foreground transition-colors",
              children: /* @__PURE__ */ jsx(Github, { className: "h-4 w-4" })
            }
          ),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: "https://twitter.com/devbrand",
              className: "hover:text-foreground transition-colors",
              children: /* @__PURE__ */ jsx(Twitter, { className: "h-4 w-4" })
            }
          ),
          /* @__PURE__ */ jsx(
            "a",
            {
              href: "https://linkedin.com/company/devbrand",
              className: "hover:text-foreground transition-colors",
              children: /* @__PURE__ */ jsx(Linkedin, { className: "h-4 w-4" })
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        FooterCol,
        {
          title: "Product",
          links: [
            { label: "Intelligence", to: "/#intelligence" },
            { label: "The Verdict", to: "/#roast" },
            { label: "Pricing", to: "/#pricing" },
            { label: "Annual Wrapped", to: "/wrapped" }
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        FooterCol,
        {
          title: "Developers",
          links: [
            { label: "Documentation", to: "/" },
            { label: "API Reference", to: "/" },
            { label: "System Status", to: "/" },
            { label: "Open Source", to: "/" }
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        FooterCol,
        {
          title: "Legal",
          links: [
            { label: "Privacy Policy", to: "/" },
            { label: "Terms of Service", to: "/" },
            { label: "Cookie Policy", to: "/" },
            { label: "Security", to: "/" }
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "border-t border-border", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        "© ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " DevBrand Intelligence Corp."
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-6", children: [
        /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx("span", { className: "h-1 w-1 rounded-full bg-green-500" }),
          " All systems operational"
        ] }),
        /* @__PURE__ */ jsx("span", { className: "font-mono lowercase tracking-normal opacity-50", children: "v1.0.4-stable" })
      ] })
    ] }) })
  ] });
}
function FooterCol({
  title,
  links
}) {
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("div", { className: "text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-8", children: title }),
    /* @__PURE__ */ jsx("ul", { className: "space-y-4", children: links.map((l, i) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
      Link,
      {
        to: l.to,
        className: "text-sm font-medium text-foreground/60 hover:text-blue-500 transition-colors",
        children: l.label
      }
    ) }, i)) })
  ] });
}
const EASE = [0.16, 1, 0.3, 1];
function offset(direction, distance) {
  switch (direction) {
    case "up":
      return { x: 0, y: distance };
    case "down":
      return { x: 0, y: -distance };
    case "left":
      return { x: distance, y: 0 };
    case "right":
      return { x: -distance, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}
function Reveal({
  distance = 24,
  direction = "up",
  delay = 0,
  duration = 0.8,
  stagger,
  once = true,
  rootMargin = "-10% 0px -10% 0px",
  as = "div",
  className,
  children,
  ...rest
}) {
  const off = offset(direction, distance);
  const containerVariants = {
    hidden: { opacity: 0, ...off },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: EASE,
        when: stagger ? "beforeChildren" : void 0,
        staggerChildren: stagger
      }
    }
  };
  const MotionTag = motion[as];
  return /* @__PURE__ */ jsx(
    MotionTag,
    {
      className,
      variants: containerVariants,
      initial: "hidden",
      whileInView: "visible",
      viewport: { once, margin: rootMargin },
      ...rest,
      children
    }
  );
}
function RevealItem({
  distance = 16,
  direction = "up",
  className,
  children
}) {
  const off = offset(direction, distance);
  const itemVariants = {
    hidden: { opacity: 0, ...off },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.6, ease: EASE }
    }
  };
  return /* @__PURE__ */ jsx(motion.div, { className, variants: itemVariants, children });
}
const REVEAL_EASE = EASE;
function LandingPage() {
  const {
    isLoggedIn
  } = Route.useLoaderData();
  const [prInput, setPrInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code && !isAuthLoading) {
      setIsAuthLoading(true);
      exchangeAuthCode({
        data: code
      }).then(() => {
        window.history.replaceState({}, document.title, "/");
        window.location.reload();
      }).catch((err) => {
        setError(err.message);
        setIsAuthLoading(false);
      });
    }
  }
  const handleLogin = async () => {
    try {
      const url = await getAuthUrl();
      window.location.href = url;
    } catch (err) {
      setError(err.message);
    }
  };
  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prInput.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await generatePost({
        data: prInput.trim()
      });
      setResult(data);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };
  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.linkedInSpin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-[#09090b] selection:bg-amber-500/30 font-sans", children: [
    /* @__PURE__ */ jsxs("main", { className: "w-full flex flex-col items-center min-h-[90vh] px-4 pt-20 pb-20 relative overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-amber-500/10 blur-[150px] rounded-[100%] pointer-events-none mix-blend-screen opacity-50" }),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent_80%)] opacity-20 pointer-events-none" }),
      /* @__PURE__ */ jsxs("div", { className: "relative z-10 flex flex-col items-center w-full max-w-6xl", children: [
        /* @__PURE__ */ jsxs(Reveal, { stagger: 0.1, className: "flex flex-col items-center text-center w-full", children: [
          /* @__PURE__ */ jsx(RevealItem, { children: /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-8 backdrop-blur-md", children: [
            /* @__PURE__ */ jsx(Gavel, { className: "h-3 w-3" }),
            " The Judgment Engine"
          ] }) }),
          /* @__PURE__ */ jsx(RevealItem, { children: /* @__PURE__ */ jsxs("h1", { className: "text-5xl md:text-[70px] font-black tracking-tight mb-6 leading-[1.05] text-white", children: [
            "Turn your PRs into ",
            /* @__PURE__ */ jsx("br", { className: "hidden md:block" }),
            /* @__PURE__ */ jsx("span", { className: "text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600", children: "LinkedIn clout." })
          ] }) }),
          /* @__PURE__ */ jsx(RevealItem, { children: /* @__PURE__ */ jsx("p", { className: "text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed font-light mx-auto", children: "Paste a GitHub Pull Request. OBLITERATUS will give you the Brutal Truth about your code, and then translate it into a corporate, emoji-filled LinkedIn post." }) }),
          /* @__PURE__ */ jsxs(RevealItem, { className: "w-full max-w-3xl mx-auto", children: [
            /* @__PURE__ */ jsxs("form", { onSubmit: handleGenerate, className: "relative group w-full", children: [
              /* @__PURE__ */ jsx("div", { className: "absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" }),
              /* @__PURE__ */ jsxs("div", { className: "relative flex items-center w-full bg-zinc-900/80 border border-zinc-800 rounded-full p-2 backdrop-blur-xl shadow-2xl transition-all focus-within:border-amber-500/50 focus-within:bg-zinc-900", children: [
                /* @__PURE__ */ jsx("div", { className: "pl-6 pr-4 text-zinc-500", children: /* @__PURE__ */ jsx(Github, { className: "h-5 w-5" }) }),
                /* @__PURE__ */ jsx("input", { type: "text", placeholder: "https://github.com/owner/repo/pull/123", value: prInput, onChange: (e) => setPrInput(e.target.value), className: "flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-600 text-lg py-4 font-mono w-full" }),
                /* @__PURE__ */ jsxs("button", { type: "submit", disabled: !prInput.trim() || isLoading, className: "ml-2 px-8 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold disabled:opacity-50 transition-all flex items-center gap-2", children: [
                  isLoading ? "Analyzing..." : "Generate Post",
                  " ",
                  /* @__PURE__ */ jsx(ArrowRight, { className: "h-4 w-4" })
                ] })
              ] })
            ] }),
            error && /* @__PURE__ */ jsx("div", { className: "text-red-400 mt-4 text-sm font-medium", children: error })
          ] }),
          /* @__PURE__ */ jsx(RevealItem, { className: "mt-6", children: isLoggedIn ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm text-zinc-400", children: [
            /* @__PURE__ */ jsx(CheckCircle2, { className: "h-4 w-4 text-green-500" }),
            /* @__PURE__ */ jsx("span", { children: "Authenticated with GitHub (Private PRs supported)" }),
            /* @__PURE__ */ jsx("button", { onClick: handleLogout, className: "text-amber-500 hover:text-amber-400 underline ml-2", children: "Sign out" })
          ] }) : /* @__PURE__ */ jsxs("button", { onClick: handleLogin, disabled: isAuthLoading, className: "flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full shadow-lg disabled:opacity-50", children: [
            /* @__PURE__ */ jsx(Github, { className: "h-4 w-4" }),
            isAuthLoading ? "Authenticating..." : "Sign in with GitHub for Private PRs"
          ] }) })
        ] }),
        /* @__PURE__ */ jsx(AnimatePresence, { children: result && /* @__PURE__ */ jsxs(motion.div, { initial: {
          opacity: 0,
          y: 40
        }, animate: {
          opacity: 1,
          y: 0
        }, exit: {
          opacity: 0,
          y: 20
        }, transition: {
          duration: 0.6,
          ease: REVEAL_EASE
        }, className: "w-full mt-16 grid grid-cols-1 md:grid-cols-2 gap-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full bg-zinc-900/50 border border-red-900/30 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-red-950/30 border-b border-red-900/30 px-6 py-4 flex items-center gap-3", children: [
              /* @__PURE__ */ jsx(Flame, { className: "text-red-500 h-5 w-5" }),
              /* @__PURE__ */ jsx("h3", { className: "text-red-400 font-bold uppercase tracking-wider text-sm", children: "The Brutal Truth" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "p-6 text-zinc-300 font-mono text-sm leading-relaxed whitespace-pre-wrap", children: result.brutalTruth })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full bg-zinc-900/50 border border-blue-900/30 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl relative", children: [
            /* @__PURE__ */ jsxs("div", { className: "bg-blue-950/30 border-b border-blue-900/30 px-6 py-4 flex items-center justify-between", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsx(Linkedin, { className: "text-blue-500 h-5 w-5" }),
                /* @__PURE__ */ jsx("h3", { className: "text-blue-400 font-bold uppercase tracking-wider text-sm", children: "The LinkedIn Spin" })
              ] }),
              /* @__PURE__ */ jsx("button", { onClick: copyToClipboard, className: "flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold transition-colors", children: copied ? /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(CheckCircle2, { className: "h-3 w-3" }),
                " Copied"
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Copy, { className: "h-3 w-3" }),
                " Copy Post"
              ] }) })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "p-6 text-zinc-200 text-[15px] leading-relaxed whitespace-pre-wrap font-sans", children: result.linkedInSpin })
          ] })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Footer, {})
  ] });
}
export {
  LandingPage as component
};
