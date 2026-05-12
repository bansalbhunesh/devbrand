import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Github,
  Sparkles,
  LayoutDashboard,
  Loader2,
  Code2,
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
import { REVEAL_EASE } from "./Reveal";

const springConfig = { damping: 25, stiffness: 120, mass: 0.5 };

// Tighter entrance choreography. The prior sequence had delays up to 3.2s
// before the user saw the full hero settled — too much "loading-feel" for a
// landing page. This pace lands in ~1.4s while keeping the staged reveal.
const T_BADGE = 0.05;
const T_HEAD = 0.18;
const T_SUBHEAD = 0.6;
const T_CTA = 0.78;
const T_CARD = 0.95;
const T_PROGRESS = 1.4;

export function Hero() {
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const matches = useMatches();
  const session = (matches.find((m) => m.id === "__root")?.context as any)
    ?.session;

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

  const rotateX = useSpring(
    useTransform(cardY, [-300, 300], [15, -15]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(cardX, [-300, 300], [-15, 15]),
    springConfig,
  );

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
            ([x, y]) =>
              `radial-gradient(600px circle at ${x as number}px ${y as number}px, oklch(65% 0.2 250 / 0.05), transparent 80%)`,
          ),
        }}
      />

      <motion.div
        style={{ opacity, scale, y }}
        className="relative z-10 mx-auto max-w-7xl px-6 w-full"
      >
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: T_BADGE, ease: REVEAL_EASE }}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/80 border border-blue-500/20 rounded-full px-4 py-2 bg-blue-500/5 backdrop-blur-xl mb-12"
          >
            <ShieldCheck className="h-3 w-3" />
            Verified Engineering Intelligence
          </motion.div>

          <div className="relative mb-12">
            <h1 className="text-7xl md:text-9xl lg:text-[12rem] font-black tracking-[-0.08em] leading-[0.8] text-balance">
              <span className="inline-block relative">
                <TextReveal text="SYSTEMS" delay={T_HEAD} />
                {/* Refined underglow: a horizontal gradient sweep, not a flat
                    blurred bar. Reads as a subtle accent rather than a marker. */}
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{
                    delay: T_HEAD + 0.5,
                    duration: 0.9,
                    ease: REVEAL_EASE,
                  }}
                  style={{ transformOrigin: "left" }}
                  className="absolute -bottom-3 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-purple-500/0 blur-[2px]"
                />
              </span>
              <br />
              <span
                className="inline-block bg-clip-text text-transparent drop-shadow-[0_0_60px_rgba(120,140,255,0.18)]"
                style={{
                  backgroundImage:
                    "linear-gradient(180deg, #ffffff 0%, #ffffff 55%, rgba(180,195,255,0.85) 100%)",
                }}
              >
                <TextReveal text="OF PROOF" delay={T_HEAD + 0.32} />
              </span>
            </h1>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: T_SUBHEAD, ease: REVEAL_EASE }}
            className="max-w-2xl text-[18px] md:text-[22px] leading-relaxed text-muted-foreground/75 text-pretty font-medium mb-14 tracking-tight"
          >
            DevBrand transforms the invisible labor of engineering into
            verifiable, high-fidelity career leverage.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: T_CTA, ease: REVEAL_EASE }}
            className="flex flex-wrap items-center justify-center gap-5"
          >
            <AnimatePresence mode="wait">
              {session ? (
                <Link
                  to="/dashboard"
                  className="group relative inline-flex items-center gap-4 px-10 py-5 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)] hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-12px_rgba(80,120,255,0.35),0_0_0_1px_rgba(255,255,255,0.12)] active:translate-y-0"
                >
                  <LayoutDashboard className="h-4 w-4" /> Open Workspace
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              ) : (
                <button
                  onClick={handleAuth}
                  disabled={loggingIn}
                  className="group relative inline-flex items-center gap-4 px-10 py-5 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.06)] hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-12px_rgba(80,120,255,0.35),0_0_0_1px_rgba(255,255,255,0.12)] active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
                >
                  {/* Subtle idle shimmer to draw the eye back to the primary CTA.
                      Pure CSS / GPU transform, runs continuously but is cheap. */}
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-12deg] group-hover:animate-[shine_900ms_ease-out] motion-reduce:hidden" />
                  {loggingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Github className="h-4 w-4" />
                  )}
                  Initialize Session
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              )}
            </AnimatePresence>

            <a
              href="#demo"
              className="group inline-flex items-center gap-4 px-10 py-5 rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-3xl hover:bg-white/[0.07] hover:border-white/20 text-foreground transition-all duration-300 font-black text-xs uppercase tracking-[0.2em]"
            >
              <Terminal className="h-4 w-4 text-blue-500 transition-transform duration-300 group-hover:rotate-[-8deg]" />{" "}
              View Methodology
            </a>
          </motion.div>
        </div>

        {/* 3D Showcase Card - Elite Overhaul */}
        <div className="relative mt-40 perspective-2000 px-4">
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, rotateX: 14, y: 60 }}
            animate={{ opacity: 1, rotateX: 0, y: 0 }}
            transition={{ duration: 1.4, delay: T_CARD, ease: REVEAL_EASE }}
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
                    navigator.clipboard?.writeText(
                      "https://devbrand.app/t/9f2c",
                    );
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
                    "Optimized concurrent cache hydration with distributed
                    mutex"
                  </h3>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest mb-1">
                        Delta
                      </span>
                      <span className="text-xs font-black text-green-500">
                        +2,401
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-widest mb-1">
                        Impact
                      </span>
                      <span className="text-xs font-black text-blue-500">
                        Z-Tier
                      </span>
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
                    "Architected a resilient synchronization layer that
                    eliminated race conditions during global cache invalidation.
                    Reduced tail latency by 42% at peak load."
                  </p>
                  <div className="mt-12 pt-12 border-t border-white/5 grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "85%" }}
                          transition={{
                            delay: T_PROGRESS,
                            duration: 1.2,
                            ease: REVEAL_EASE,
                          }}
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
                          transition={{
                            delay: T_PROGRESS + 0.15,
                            duration: 1.2,
                            ease: REVEAL_EASE,
                          }}
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

function TextReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const letters = Array.from(text);
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.035, delayChildren: delay },
    },
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.55, ease: REVEAL_EASE },
    },
    hidden: {
      opacity: 0,
      y: 28,
      filter: "blur(6px)",
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
