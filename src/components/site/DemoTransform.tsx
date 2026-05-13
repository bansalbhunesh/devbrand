"use client";

import * as React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  type MotionValue,
} from "framer-motion";
import { Check, Link2, GitCommit, ArrowDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDemoOutputs } from "@/rpc";
import { REVEAL_EASE } from "./Reveal";

/**
 * DemoTransform — cinematic before/after.
 *
 * Each pair is a full-bleed stage. Scroll into a pair and a horizontal
 * scan line sweeps left→right; under the scan the BEFORE text fades
 * back, AFTER materializes with a kinetic blur-in. Citations stagger in
 * beneath. The AFTER side has cursor-tilt parallax. A floating "STAGE
 * 01 / NN" marker tracks the section's progress on the left rail.
 *
 * Implementation: useScroll(target=stageRef) gives a 0→1 progress for
 * each pair as it enters and exits the viewport. Mapping the typical
 * "start-end → end-start" range to scan-line position + per-element
 * opacity/blur lets the user "scrub" the transformation by scrolling.
 * Lenis (mounted in __root.tsx) smooths the input so the animation is
 * inertia-driven, not jittery.
 */

const fallbackPairs = [
  {
    before: "Fixed API issue in payments worker.",
    after:
      "Redesigned async retry handling to improve backend reliability under concurrent transaction loads. Implemented exponential jittered backoff that recovered 0.3% of previously-dropped transactions ($4.2k/mo).",
    tag: "Reliability",
    repo: "payments-svc",
    pr: "#1428",
    citations: [
      { ref: "lib/retry.ts:42", sha: "a4f1c2" },
      { ref: "lib/queue.ts:108", sha: "c81dba" },
    ],
    slug: "9f2c",
  },
  {
    before: "Refactored session handling logic.",
    after:
      "Migrated session handling from cookie-bound state to a stateless JWT pipeline, cutting auth latency p95 by 38% and unlocking the edge-routing rollout that had been blocked on session stickiness.",
    tag: "Architecture",
    repo: "edge-gateway",
    pr: "#812",
    citations: [
      { ref: "auth/session.ts:1", sha: "7b22ee" },
      { ref: "edge/routing.ts:54", sha: "92aaf0" },
    ],
    slug: "3a71",
  },
];

export function DemoTransform() {
  const { data: dbOutputs } = useQuery({
    queryKey: ["demo-outputs"],
    queryFn: () => getDemoOutputs(),
  });

  const displayPairs = dbOutputs?.length
    ? dbOutputs.map((o) => {
        const rawCitations = Array.isArray(o.citations) ? o.citations : [];
        const citations =
          rawCitations.length > 0
            ? rawCitations
            : [{ ref: "diff", sha: "head" }];
        return {
          before:
            o.prCommitMessage || "Updated logic and optimized performance.",
          after: o.linkedinPost1,
          tag: o.category ?? "Impact",
          repo: o.prUrl?.split("/").slice(-3, -1).join("/") ?? "repo",
          pr: `#${o.prUrl?.split("/").pop()}`,
          citations,
          slug: o.slug,
        };
      })
    : fallbackPairs;

  return (
    <section
      id="demo"
      className="relative bg-muted/[0.02] border-t border-border overflow-hidden"
    >
      {/* Section header */}
      <div className="mx-auto max-w-7xl px-6 pt-32 pb-16">
        <SectionLabel>The transformation</SectionLabel>
        <SectionTitle>
          From{" "}
          <span className="font-mono text-muted-foreground">"fixed bug"</span>{" "}
          to a story <br className="hidden md:block" />a recruiter actually
          understands.
        </SectionTitle>
        <p className="mt-6 max-w-2xl text-muted-foreground text-lg leading-relaxed">
          Every line is grounded in real diffs. Scroll a pair into view to watch
          the engine reconstruct strategic narrative from raw commit chatter —
          citations included.
        </p>
      </div>

      {/* Stages */}
      <div className="space-y-12 md:space-y-20 pb-32">
        {displayPairs.map((p, i) => (
          <Stage
            key={p.slug ?? i}
            pair={p}
            index={i}
            total={displayPairs.length}
          />
        ))}
      </div>
    </section>
  );
}

interface StageProps {
  pair: {
    before: string;
    after: string;
    tag: string;
    repo: string;
    pr: string;
    citations: Array<{ ref?: string; sha?: string }>;
    slug?: string;
  };
  index: number;
  total: number;
}

function Stage({ pair, index, total }: StageProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Smoothed progress so the scan line doesn't twitch on rapid scroll —
  // Lenis already inertia-paces input; this damps the residual rendering.
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.5,
  });

  // The active band — the moment of transformation — happens in the
  // middle 35–70% of the section's scroll window. Tight enough that the
  // user feels the alchemy happen, wide enough that they can pause and
  // read either side.
  const scanX = useTransform(progress, [0.35, 0.7], ["0%", "100%"]);
  const beforeOpacity = useTransform(progress, [0.35, 0.55], [1, 0.28]);
  const afterOpacity = useTransform(progress, [0.42, 0.7], [0, 1]);
  const afterBlur = useTransform(progress, [0.42, 0.7], [14, 0]);
  const afterY = useTransform(progress, [0.42, 0.7], [24, 0]);

  // The scan line itself: a thin vertical stroke with a bright halo. We
  // fade it in/out at the edges of the active band so it doesn't sit
  // static at the start or finish.
  const scanOpacity = useTransform(
    progress,
    [0.32, 0.4, 0.65, 0.72],
    [0, 1, 1, 0],
  );

  // Stage marker — pinned on the left rail, fades in as the stage enters.
  const markerOpacity = useTransform(progress, [0.1, 0.3], [0, 1]);

  // Cursor tilt for the AFTER pane.
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const sTiltX = useSpring(tiltX, { stiffness: 200, damping: 20, mass: 0.4 });
  const sTiltY = useSpring(tiltY, { stiffness: 200, damping: 20, mass: 0.4 });
  const onAfterMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    // ±4° feels intentional; more and it reads as gimmick.
    tiltX.set(-ny * 4);
    tiltY.set(nx * 4);
  };
  const onAfterLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  return (
    <div
      ref={ref}
      className="relative mx-auto max-w-7xl px-6 min-h-[90vh] grid place-items-center"
    >
      {/* Stage marker — small floating chip top-left of the section. */}
      <motion.div
        style={{ opacity: markerOpacity }}
        className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/70 pointer-events-none"
      >
        <span className="text-blue-500/80 font-mono">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="h-px w-12 bg-gradient-to-r from-blue-500/40 to-transparent" />
        <span>
          Stage {String(index + 1).padStart(2, "0")} /{" "}
          {String(total).padStart(2, "0")}
        </span>
      </motion.div>

      {/* The actual stage content — grid of BEFORE / scan / AFTER */}
      <div className="w-full grid md:grid-cols-[1fr_minmax(0,32px)_1.4fr] gap-8 md:gap-0 items-stretch relative">
        {/* BEFORE */}
        <BeforePane pair={pair} opacity={beforeOpacity} />

        {/* Center divider + scan line */}
        <div className="hidden md:flex justify-center items-stretch relative">
          <div className="w-px h-full bg-gradient-to-b from-transparent via-white/8 to-transparent" />
          <motion.div
            style={{ left: scanX, opacity: scanOpacity }}
            className="pointer-events-none absolute top-0 bottom-0 w-px"
            aria-hidden
          >
            <div className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-blue-300/90 to-transparent" />
            <div className="absolute inset-y-0 -left-[6px] w-[13px] blur-[6px] bg-gradient-to-b from-transparent via-blue-400/50 to-transparent" />
            <div className="absolute top-1/2 -translate-y-1/2 -left-1 h-2 w-2 rounded-full bg-blue-200 shadow-[0_0_18px_4px_rgba(180,200,255,0.6)]" />
          </motion.div>
        </div>

        {/* Mobile-only scan line — same energy, vertical orientation flipped. */}
        <motion.div
          style={{ opacity: scanOpacity }}
          className="md:hidden flex items-center justify-center text-blue-300/80 -my-2"
          aria-hidden
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" />
          <ArrowDown className="h-3 w-3 mx-3" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-300/60 to-transparent" />
        </motion.div>

        {/* AFTER */}
        <motion.div
          style={{
            opacity: afterOpacity,
            y: afterY,
            filter: useTransform(afterBlur, (b) => `blur(${b}px)`),
            rotateX: sTiltX,
            rotateY: sTiltY,
            transformPerspective: 1400,
            willChange: "transform, opacity, filter",
          }}
          onMouseMove={onAfterMove}
          onMouseLeave={onAfterLeave}
          className="relative"
        >
          <AfterPane pair={pair} />
        </motion.div>
      </div>
    </div>
  );
}

function BeforePane({
  pair,
  opacity,
}: {
  pair: StageProps["pair"];
  opacity: MotionValue<number>;
}) {
  return (
    <motion.div
      style={{ opacity }}
      className="relative p-8 md:p-10 rounded-[2rem] border border-white/5 bg-background/40 backdrop-blur-sm flex flex-col justify-center"
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 font-black mb-6">
        <span>Before · raw commit</span>
        <span className="font-mono normal-case tracking-normal text-[11px]">
          {pair.repo} · {pair.pr}
        </span>
      </div>
      <p className="font-mono text-lg md:text-xl text-foreground/70 leading-relaxed italic">
        "{pair.before}"
      </p>
      <div className="mt-8 flex items-center gap-2 text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest font-bold">
        <GitCommit className="h-3.5 w-3.5 text-blue-500/70" />{" "}
        {pair.citations[0]?.sha?.slice(0, 7) ?? "head"}
      </div>
    </motion.div>
  );
}

function AfterPane({ pair }: { pair: StageProps["pair"] }) {
  const [copied, setCopied] = React.useState(false);
  const url = `devbrand.app/t/${pair.slug ?? ""}`;

  return (
    <div className="p-8 md:p-12 rounded-[2.5rem] border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.06] via-transparent to-purple-500/[0.04] relative overflow-hidden">
      {/* Inner halo — picks up the AFTER pane as the bright side of the
          composition without competing with the actual text. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-12 opacity-60"
        style={{
          background:
            "radial-gradient(50% 50% at 20% 0%, rgba(120,160,255,0.12), transparent 70%)",
        }}
      />

      <div className="relative flex items-center justify-between mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-blue-300 font-black">
          After · narrative
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-muted-foreground border border-white/10 rounded-lg px-2 py-1 uppercase tracking-widest bg-white/5">
            {pair.tag}
          </span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(`https://${url}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            }}
            className="text-[10px] font-bold inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/10"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Share"}
          </button>
        </div>
      </div>

      <p className="relative text-[19px] md:text-[22px] leading-[1.55] text-pretty font-medium text-foreground/95">
        {pair.after}
      </p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ duration: 0.6, delay: 0.15, ease: REVEAL_EASE }}
        className="relative mt-10 p-5 rounded-2xl border border-blue-500/15 bg-blue-500/[0.04]"
      >
        <div className="text-[9px] uppercase tracking-[0.3em] text-blue-300 font-black mb-4">
          Verifiable Evidence
        </div>
        <ol className="space-y-2.5">
          {pair.citations.map((c, idx) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{
                duration: 0.5,
                delay: 0.25 + idx * 0.08,
                ease: REVEAL_EASE,
              }}
              className="flex items-center gap-3 text-[12px] font-mono"
            >
              <span className="text-blue-300 font-bold">
                [{String(idx + 1).padStart(2, "0")}]
              </span>
              <span className="text-foreground/80 truncate">{c.ref}</span>
              <span className="opacity-20">·</span>
              <span className="opacity-50 text-foreground/60">
                {c.sha?.slice(0, 7) ?? "head"}
              </span>
            </motion.li>
          ))}
        </ol>
      </motion.div>

      <div className="relative mt-6 text-[10px] font-mono text-muted-foreground/40 font-bold uppercase tracking-widest">
        {url}
      </div>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.25em] text-blue-500 font-black mb-6">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.05]">
      {children}
    </h2>
  );
}
