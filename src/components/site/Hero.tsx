import * as React from "react";
import { useRef, useState } from "react";
import {
  ArrowRight,
  Github,
  Sparkles,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Link, useMatches } from "@tanstack/react-router";
import { signInWithGithub } from "@/rpc";
import { motion, AnimatePresence } from "framer-motion";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const matches = useMatches();
  const session = (matches.find((m) => m.id === "__root")?.context as any)
    ?.session;

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
    <section
      ref={containerRef}
      className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-32 pb-20 bg-background"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-grid opacity-[0.05]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 border border-blue-500/20 rounded-full px-4 py-2 bg-blue-500/5 mb-8 shadow-sm"
        >
          <ShieldCheck className="h-3 w-3" />
          Verified Engineering Intelligence
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1] mb-8"
        >
          Turn raw code into <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
            career leverage.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-12 leading-relaxed font-medium"
        >
          DevBrand analyzes your engineering impact, finds the "hidden" value in
          your work, and builds a verifiable reputation that recruiters actually
          understand.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <AnimatePresence mode="wait">
            {session ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-foreground text-background font-bold text-sm tracking-tight hover:opacity-90 transition shadow-xl"
              >
                <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                onClick={handleAuth}
                disabled={loggingIn}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-foreground text-background font-bold text-sm tracking-tight hover:opacity-90 transition shadow-xl disabled:opacity-70"
              >
                {loggingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Github className="h-4 w-4" />
                )}
                Start Building Your Brand
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </AnimatePresence>

          <a
            href="#demo"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm font-bold tracking-tight"
          >
            <Terminal className="h-4 w-4 text-blue-500" />
            See How it Works
          </a>
        </motion.div>
      </div>

      {/* Simplified Preview Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.4 }}
        className="relative mt-24 mx-auto max-w-5xl px-6 w-full"
      >
        <div className="rounded-3xl border border-white/10 bg-muted/20 backdrop-blur-3xl overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-8 py-4 border-b border-white/5 bg-white/5">
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500/20" />
              <div className="h-2 w-2 rounded-full bg-yellow-500/20" />
              <div className="h-2 w-2 rounded-full bg-green-500/20" />
            </div>
            <div className="text-[9px] font-mono font-bold tracking-widest text-muted-foreground/40 uppercase">
              Analysis Engine Live
            </div>
          </div>
          <div className="p-8 md:p-12 grid md:grid-cols-2 gap-12 text-left">
            <div className="space-y-6">
              <div className="inline-flex px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 font-mono text-[10px] text-blue-400">
                commit: 9f2c7a1
              </div>
              <h3 className="text-xl md:text-2xl font-bold leading-tight">
                "Optimized concurrent cache hydration with distributed mutex"
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed italic">
                Raw commit messages often hide the real impact.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5 space-y-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500">
                <Sparkles className="h-3 w-3" />
                Impact Narrative
              </div>
              <p className="text-foreground leading-relaxed font-medium">
                "Architected a resilient synchronization layer that eliminated
                race conditions during global cache invalidation. Reduced tail
                latency by 42% at peak load."
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
