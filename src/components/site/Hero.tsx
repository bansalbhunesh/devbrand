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
  Code2,
  Zap,
  Globe,
  Cpu,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Link, useMatches } from "@tanstack/react-router";
import { signInWithGithub } from "@/rpc";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  useScroll,
} from "framer-motion";
import { NeuralBackground } from "./NeuralBackground";

const springConfig = { damping: 25, stiffness: 120, mass: 0.5 };

export function Hero() {
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const matches = useMatches();
  const session = (matches.find((m) => m.id === "__root")?.context as any)?.session;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const rotateX = useSpring(useTransform(cardY, [-300, 300], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(cardX, [-300, 300], [-15, 15]), springConfig);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const centerX = r.left + r.width / 2;
      const centerY = r.top + r.height / 2;
      cardX.set(e.clientX - centerX);
      cardY.set(e.clientY - centerY);

      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      el.style.setProperty("--mx", `${mx}px`);
      el.style.setProperty("--my", `${my}px`);
      
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const onLeave = () => {
      cardX.set(0);
      cardY.set(0);
    };

    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [cardX, cardY, mouseX, mouseY]);

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
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-32 pb-20"
    >
      {/* Cinematic Overlays */}
      <NeuralBackground />
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-[0.1]" />
      
      {/* Cursor Spotlight */}
      <motion.div 
        className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) => `radial-gradient(600px circle at ${x as number}px ${y as number}px, oklch(65% 0.2 250 / 0.05), transparent 80%)`
          )
        }}
      />

      <motion.div 
        style={{ opacity, scale, y }}
        className="relative z-10 mx-auto max-w-7xl px-6 w-full"
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/80 border border-blue-500/20 rounded-full px-4 py-2 bg-blue-500/5 backdrop-blur-xl mb-12"
          >
            <ShieldCheck className="h-3 w-3" /> 
            Verified Engineering Intelligence
          </motion.div>

          <div className="relative mb-12">
            <h1 className="text-7xl md:text-9xl lg:text-[12rem] font-black tracking-[-0.08em] leading-[0.8] text-balance">
              <span className="inline-block relative">
                <TextReveal text="SYSTEMS" delay={0.2} />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1, duration: 1, ease: "circOut" }}
                  className="absolute -bottom-4 left-0 h-2 bg-blue-500/20 blur-sm"
                />
              </span>
              <br />
              <span className="text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                <TextReveal text="OF PROOF" delay={0.6} />
              </span>
            </h1>
          </div>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 1.4 }}
            className="max-w-2xl text-[18px] md:text-[22px] leading-relaxed text-muted-foreground/50 text-pretty font-medium mb-16 tracking-tight"
          >
            DevBrand transforms the invisible labor of engineering into 
            verifiable high-fidelity career leverage.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.8 }}
            className="flex flex-wrap items-center justify-center gap-8"
          >
            <AnimatePresence mode="wait">
              {session ? (
                <Link
                  to="/dashboard"
                  className="group relative inline-flex items-center gap-4 px-10 py-5 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] active:scale-95"
                >
                  <LayoutDashboard className="h-4 w-4" /> Open Workspace
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              ) : (
                <button
                  onClick={handleAuth}
                  disabled={loggingIn}
                  className="group relative inline-flex items-center gap-4 px-10 py-5 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] active:scale-95"
                >
                  {loggingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Github className="h-4 w-4" />
                  )}
                  Initialize Session
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </button>
              )}
            </AnimatePresence>
            
            <a
              href="#demo"
              className="inline-flex items-center gap-4 px-10 py-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-3xl hover:bg-white/10 text-foreground transition-all font-black text-xs uppercase tracking-[0.2em]"
            >
              <Terminal className="h-4 w-4 text-blue-500" /> View Methodology
            </a>
          </motion.div>
        </div>

        {/* 3D Showcase Card - Elite Overhaul */}
        <div className="relative mt-40 perspective-2000 px-4">
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, rotateX: 20, y: 100 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            transition={{ duration: 2, delay: 2.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="mx-auto max-w-5xl rounded-[3.5rem] border border-white/10 bg-[#0A0A0A]/80 backdrop-blur-[100px] shadow-[0_0_150px_rgba(0,0,0,0.8)] overflow-hidden border-glow group/card"
          >
            <div className="flex items-center justify-between px-10 py-6 border-b border-white/5 bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/40" />
              </div>
              <div className="text-[11px] font-black font-mono text-blue-500/40 uppercase tracking-[0.6em]">
                NEURAL_SIGNAL_v2.0.4
              </div>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText("https://devbrand.app/t/9f2c");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1400);
                  }}
                  className="text-[10px] font-black text-muted-foreground/60 hover:text-foreground transition-colors tracking-widest"
                >
                  {copied ? "COPIED" : "EXPORT"}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/5">
              <div className="p-12 lg:p-16 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                  <Code2 className="h-40 w-40" />
                </div>
                <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground/30 mb-12">
                  <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                  Primary Logic Node #412
                </div>
                <div className="space-y-8">
                  <div className="inline-flex px-3 py-1 rounded-lg bg-white/5 border border-white/5 font-mono text-[10px] text-muted-foreground/50">
                    commit: 9f2c7a1
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">
                    "Optimized concurrent cache hydration with distributed mutex"
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest mb-1">Delta</span>
                      <span className="text-xs font-black text-green-500">+2,401</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest mb-1">Impact</span>
                      <span className="text-xs font-black text-blue-500">Z-Tier</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-12 lg:p-16 bg-blue-500/[0.01] relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-small opacity-[0.02] pointer-events-none" />
                <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] text-blue-500/60 mb-12">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                  Neural Impact Narrative
                </div>
                <div className="relative">
                  <p className="text-xl leading-relaxed text-foreground/90 font-medium italic">
                    "Architected a resilient synchronization layer that eliminated 
                    race conditions during global cache invalidation. Reduced 
                    tail latency by 42% at peak load."
                  </p>
                  <div className="mt-12 pt-12 border-t border-white/5 grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "85%" }}
                          transition={{ delay: 3, duration: 1.5 }}
                          className="h-full bg-blue-500"
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-30">
                        <span>Technical Depth</span>
                        <span>85%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "92%" }}
                          transition={{ delay: 3.2, duration: 1.5 }}
                          className="h-full bg-purple-500"
                        />
                      </div>
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-30">
                        <span>Arch Alignment</span>
                        <span>92%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function FloatingIcon({ icon, delay, top, left }: { icon: React.ReactNode; delay: number; top: string; left: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0.2, 0.5, 0.2], 
        scale: 1,
        y: [0, -30, 0],
        rotate: [0, 15, -15, 0]
      }}
      transition={{ 
        duration: 10, 
        delay, 
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className="absolute text-blue-400/40"
      style={{ top, left }}
    >
      {icon}
    </motion.div>
  );
}

function TextReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const letters = Array.from(text);
  const container = {
    hidden: { opacity: 0 },
    visible: (i: number = 1) => ({
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: delay * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
      },
    },
    hidden: {
      opacity: 0,
      y: 50,
      filter: "blur(10px)",
    },
  };

  return (
    <motion.span
      className="inline-flex"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {letters.map((letter, index) => (
        <motion.span key={index} variants={child}>
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.span>
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
