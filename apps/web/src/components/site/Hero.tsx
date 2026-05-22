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
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { TopologyHero3D } from "./TopologyHero3D";

function MagneticButton({ children, className, onClick, disabled, href, to }: any) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    x.set(mouseX * 0.2);
    y.set(mouseY * 0.2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const inner = (
    <motion.div
      style={{ x: mouseXSpring, y: mouseYSpring }}
      className="flex items-center justify-center gap-3 w-full h-full"
    >
      {children}
    </motion.div>
  );

  if (to) {
    return (
      <motion.div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <Link to={to} className={className}>{inner}</Link>
      </motion.div>
    );
  }

  if (href) {
    return (
      <motion.div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <a href={href} className={className}>{inner}</a>
      </motion.div>
    );
  }

  return (
    <motion.div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <button onClick={onClick} disabled={disabled} className={className}>
        {inner}
      </button>
    </motion.div>
  );
}

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
        <TopologyHero3D />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 border border-blue-500/20 rounded-full px-4 py-2 bg-blue-500/5 mb-8 shadow-sm"
        >
          <ShieldCheck className="h-3 w-3" />
          The Intelligence Layer for Software Systems
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl md:text-7xl lg:text-9xl font-black tracking-tighter leading-[0.9] mb-8"
        >
          Engineering <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500">
            Judgment.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-3xl mx-auto text-xl md:text-2xl text-muted-foreground mb-12 leading-tight font-medium"
        >
          AI is generating code faster than humans can understand it. Architecture is rotting silently. <br className="hidden md:block" />
          <span className="text-foreground font-bold">DevBrand is the antidote.</span> Predictive intelligence for modern repos.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <AnimatePresence mode="wait">
            {session ? (
              <MagneticButton
                to="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-foreground text-background font-bold text-sm tracking-tight hover:opacity-90 transition shadow-xl"
              >
                <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </MagneticButton>
            ) : (
              <MagneticButton
                onClick={handleAuth}
                disabled={loggingIn}
                className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-foreground text-background font-bold text-sm tracking-tight hover:opacity-90 transition shadow-xl disabled:opacity-70"
              >
                {loggingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Github className="h-4 w-4" />
                )}
                Start Building Your Brand
                <ArrowRight className="h-4 w-4" />
              </MagneticButton>
            )}
          </AnimatePresence>

          <MagneticButton
            href="#demo"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition text-sm font-bold tracking-tight backdrop-blur-md"
          >
            <Terminal className="h-4 w-4 text-blue-500" />
            See How it Works
          </MagneticButton>
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
