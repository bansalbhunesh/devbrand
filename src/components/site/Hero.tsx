"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Github,
  Sparkles,
  GitPullRequest,
  Check,
  Link2,
  LayoutDashboard,
  Loader2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { signInWithGithub } from "@/rpc";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Route } from "@/routes/__root";

const springConfig = { damping: 20, stiffness: 150, mass: 0.5 };

export function Hero() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const { session } = Route.useRouteContext() as { session: any };

  // Parallax using Motion Values for performance (no re-renders)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(
    useTransform(y, [-300, 300], [10, -10]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(x, [-300, 300], [-10, 10]),
    springConfig,
  );

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      x.set(e.clientX - centerX);
      y.set(e.clientY - centerY);

      const mouseX = e.clientX - r.left;
      const mouseY = e.clientY - r.top;
      el.style.setProperty("--mx", `${mouseX}px`);
      el.style.setProperty("--my", `${mouseY}px`);
    };
    const onLeave = () => {
      x.set(0);
      y.set(0);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [x, y]);

  const handleAuth = async () => {
    setLoggingIn(true);
    try {
      const res = await signInWithGithub();
      if ("error" in res && res.error) {
        setLoggingIn(false);
        return;
      }
      if (!("url" in res) || !res.url) {
        setLoggingIn(false);
        return;
      }
      window.location.href = res.url;
    } catch (err) {
      console.error(err);
      setLoggingIn(false);
    }
  };

  return (
    <section className="relative overflow-hidden pt-20">
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-20" />
      <div className="absolute inset-0 [background:var(--gradient-radial)] pointer-events-none" />

      {/* Ambient Particles - Framer Motion orchestrated */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              opacity: 0.1,
            }}
            animate={{
              y: ["-5%", "5%"],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              y: {
                duration: 4 + Math.random() * 6,
                repeat: Infinity,
                repeatType: "alternate",
                ease: "easeInOut",
              },
              opacity: {
                duration: 3 + Math.random() * 4,
                repeat: Infinity,
                repeatType: "alternate",
                ease: "easeInOut",
              },
            }}
            className="absolute h-1 w-1 rounded-full bg-blue-500/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 text-[11px] font-bold text-muted-foreground border border-border rounded-full pl-1 pr-3 py-1 bg-muted/30 backdrop-blur hover:text-foreground transition group cursor-default"
          >
            <span className="rounded-full bg-blue-500/10 text-blue-500 px-2 py-0.5 text-[9px]">
              BETA
            </span>
            Impact Story Engine v1.0 is live
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-8 text-5xl md:text-7xl lg:text-8xl font-bold tracking-[-0.04em] leading-[0.98] text-balance gradient-text pb-2"
          >
            Verifiable career
            <br className="hidden md:block" /> leverage for devs.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 max-w-2xl text-[17px] md:text-lg leading-[1.6] text-muted-foreground text-pretty"
          >
            DevBrand transforms your GitHub metadata — PRs, reviews, and
            architectural shifts — into high-signal posts, resume bullets, and a
            reputation layer recruiters actually trust.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <AnimatePresence mode="wait">
              {session ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <Link
                    to="/dashboard"
                    className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-bold hover:opacity-90 transition shadow-xl shadow-foreground/10"
                  >
                    <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                    <ArrowRight className="h-4 w-4 transition -mr-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              ) : (
                <motion.button
                  key="auth"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onClick={handleAuth}
                  disabled={loggingIn}
                  className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background font-bold hover:opacity-90 transition shadow-xl shadow-foreground/10 disabled:opacity-50"
                >
                  {loggingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Github className="h-4 w-4" />
                  )}
                  Connect GitHub
                  <ArrowRight className="h-4 w-4 transition -mr-0.5 group-hover:translate-x-0.5" />
                </motion.button>
              )}
            </AnimatePresence>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted text-foreground transition font-semibold"
            >
              <Sparkles className="h-4 w-4 text-blue-500" /> Watch Demo
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-8 flex flex-wrap justify-center items-center gap-6 text-[11px] font-bold text-muted-foreground uppercase tracking-widest"
          >
            <span className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-green-500" /> 30-Sec Setup
            </span>
            <span className="hidden sm:flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-green-500" /> Read-Only Access
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-green-500" /> Free to Start
            </span>
          </motion.div>
        </div>

        {/* Live transformation preview — cursor-aware */}
        <motion.div
          ref={cardRef}
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.8,
            delay: 0.4,
            type: "spring",
            bounce: 0.4,
          }}
          className="relative mt-20 md:mt-24 mx-auto max-w-5xl group/card"
          style={
            {
              perspective: 1200,
              rotateX,
              rotateY,
              transformStyle: "preserve-3d",
              ["--mx" as any]: "50%",
              ["--my" as any]: "0px",
            } as any
          }
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-40 transition group-hover/card:opacity-100"
            style={{
              background:
                "radial-gradient(600px circle at var(--mx) var(--my), rgba(59, 130, 246, 0.25), transparent 70%)",
            }}
          />
          <div className="relative rounded-2xl bg-background/40 backdrop-blur-2xl border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/20" />
              </div>
              <div className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                devbrand.app/transform/9f2c
              </div>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(
                    "https://devbrand.app/transform/9f2c",
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1400);
                }}
                className="text-[10px] font-bold inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-green-500" /> COPIED
                  </>
                ) : (
                  <>
                    <Link2 className="h-3 w-3" /> SHARE
                  </>
                )}
              </button>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Source PR — evidence side */}
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                  <GitPullRequest className="h-3.5 w-3.5 text-green-500" />
                  <span className="font-mono font-bold">payments-svc</span>
                  <span className="opacity-40">/</span>
                  <span className="font-mono">#1428</span>
                  <span className="opacity-40">/</span>
                  <span className="text-[10px] font-bold bg-green-500/10 text-green-500 px-1.5 py-0.5 rounded">
                    MERGED
                  </span>
                </div>
                <div className="font-mono text-sm leading-8 text-foreground/80">
                  <span className="text-muted-foreground/60">msg</span>{" "}
                  &nbsp;Fix retry on flaky txns
                  <br />
                  <span className="text-green-500/90 font-bold">+428</span>{" "}
                  <span className="text-red-500/90 font-bold">−164</span> &nbsp;
                  <span className="text-[10px] uppercase font-bold text-muted-foreground/60">
                    across 9 files
                  </span>
                  <div className="mt-6 rounded-xl border border-border bg-muted/10 p-4 text-[12px] leading-7 font-medium">
                    <span className="text-green-500 font-bold">+ </span>retry
                    with jittered exp backoff
                    <br />
                    <span className="text-green-500 font-bold">+ </span>
                    idempotency key per attempt
                    <br />
                    <span className="text-green-500 font-bold">+ </span>circuit
                    breaker around payments
                    <br />
                    <span className="text-red-500 font-bold">− </span>blocking
                    sync wait loop
                  </div>
                </div>
              </div>

              {/* Generated output with citations */}
              <div className="p-8 md:p-10 bg-blue-500/5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                  <span className="font-bold uppercase tracking-widest text-[10px]">
                    Intelligence Output
                  </span>
                  <span className="ml-auto text-[10px] font-mono opacity-50">
                    claude-3-5 · 1.2s
                  </span>
                </div>
                <p className="text-[15px] leading-8 text-pretty font-medium text-foreground/90">
                  Redesigned the async retry pipeline behind our payments
                  service — introducing <Cite n={1}>jittered backoff</Cite>,{" "}
                  <Cite n={2}>idempotency keys per attempt</Cite>, and a{" "}
                  <Cite n={3}>circuit breaker around upstream calls</Cite>.
                  Result: a measurable drop in duplicate charges under
                  concurrent load and a calmer on-call rotation.
                </p>

                <div className="mt-8 rounded-xl border border-border bg-background/50 p-4">
                  <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                    Verifiable Evidence
                  </div>
                  <ol className="space-y-2 text-[11px] font-mono text-muted-foreground">
                    <CiteRow n={1} ref_="lib/retry.ts:42" sha="a4f1c2" />
                    <CiteRow n={2} ref_="queue/worker.ts:118" sha="a4f1c2" />
                    <CiteRow n={3} ref_="circuit/breaker.ts:9" sha="a4f1c2" />
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* trust strip - Moved outside the 3D transform context for accurate whileInView tracking */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-12 flex flex-col items-center gap-6"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground opacity-50">
            Built for engineers shipping at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {[
              "VERCEL",
              "STRIPE",
              "LINEAR",
              "SUPABASE",
              "GITHUB",
              "RAYCAST",
            ].map((b) => (
              <span
                key={b}
                className="font-mono text-[11px] font-black tracking-[0.3em]"
              >
                {b}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Cite({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="relative">
      <span className="bg-blue-500/10 text-foreground rounded-[4px] px-0.5 -mx-0.5 ring-1 ring-blue-500/20">
        {children}
      </span>
      <sup className="ml-1 text-[10px] font-mono font-bold text-blue-500">
        [{n}]
      </sup>
    </span>
  );
}

function CiteRow({ n, ref_, sha }: { n: number; ref_: string; sha: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="text-blue-500 font-bold">[{n}]</span>
      <span className="text-foreground/70">{ref_}</span>
      <span className="opacity-20">·</span>
      <span className="opacity-40">{sha}</span>
    </li>
  );
}
