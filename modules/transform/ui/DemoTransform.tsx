"use client";

import * as React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
} from "framer-motion";
import { Check, Link2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDemoOutputs } from "@/rpc";

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
    ? dbOutputs.map((o: any) => {
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
      {/* Introduction Slide */}
      <div className="mx-auto max-w-7xl px-6 h-screen flex flex-col justify-center snap-start snap-always">
        <SectionLabel>The transformation</SectionLabel>
        <SectionTitle>
          From{" "}
          <span className="font-mono text-muted-foreground">"fixed bug"</span>{" "}
          to a story <br className="hidden md:block" />
          that actually matters.
        </SectionTitle>
        <p className="mt-6 max-w-2xl text-muted-foreground text-lg leading-relaxed">
          Watch how DevBrand reconstructs strategic narratives from raw commit
          chatter, backed by verifiable evidence.
        </p>
        <div className="mt-12 flex items-center gap-4 text-sm text-muted-foreground animate-bounce">
          <span>Scroll to explore the transformations</span>
          <div className="h-4 w-px bg-muted-foreground/30" />
        </div>
      </div>

      {/* Transformation Slides */}
      <div className="space-y-0">
        {displayPairs.map((p: any, i: number) => (
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

function Stage({ pair, index: _index, total: _total }: StageProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    mass: 1,
  });

  const scanX = useTransform(progress, [0.4, 0.6], ["0%", "100%"]);
  const scanOpacity = useTransform(progress, [0.35, 0.4, 0.6, 0.65], [0, 1, 1, 0]);
  const afterOpacity = useTransform(progress, [0.45, 0.6], [0, 1]);
  const scale = useTransform(progress, [0.3, 0.5, 0.7], [0.95, 1, 0.95]);

  return (
    <div
      ref={ref}
      className="relative mx-auto max-w-7xl px-6 h-screen flex items-center snap-start snap-always"
    >
      <motion.div style={{ scale }} className="w-full grid md:grid-cols-2 gap-8 relative items-center">
        {/* BEFORE */}
        <div className="relative p-8 md:p-10 rounded-3xl border border-white/5 bg-background/40 backdrop-blur-sm flex flex-col justify-center">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 font-black mb-6">
            <span>Before · raw commit</span>
            <span className="font-mono normal-case tracking-normal text-[11px]">
              {pair.repo} · {pair.pr}
            </span>
          </div>
          <p className="font-mono text-lg text-foreground/70 leading-relaxed italic">
            "{pair.before}"
          </p>
        </div>

        {/* AFTER */}
        <motion.div style={{ opacity: afterOpacity }} className="relative">
          <AfterPane pair={pair} />
        </motion.div>

        {/* Simplified Scan Line Divider (Desktop Only) */}
        <div className="absolute inset-0 pointer-events-none hidden md:block">
          <motion.div
            style={{ left: scanX, opacity: scanOpacity }}
            className="absolute top-0 bottom-0 w-px z-20"
          >
            <div className="absolute inset-y-0 w-px bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function AfterPane({ pair }: { pair: StageProps["pair"] }) {
  const [copied, setCopied] = React.useState(false);
  const url = `devbrand.app/t/${pair.slug ?? ""}`;

  return (
    <div className="p-8 md:p-10 rounded-3xl border border-blue-500/20 bg-blue-500/[0.03] relative overflow-hidden">
      <div className="relative flex items-center justify-between mb-6">
        <div className="text-[10px] uppercase tracking-[0.3em] text-blue-400 font-black">
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
            className="text-[10px] font-bold inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Share"}
          </button>
        </div>
      </div>

      <p className="relative text-xl leading-relaxed font-medium text-foreground">
        {pair.after}
      </p>

      <div className="mt-8 p-4 rounded-xl border border-blue-500/10 bg-blue-500/[0.02]">
        <div className="text-[9px] uppercase tracking-[0.3em] text-blue-400/60 font-black mb-3">
          Evidence
        </div>
        <div className="space-y-1.5">
          {pair.citations.map((c, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="text-blue-400">[{idx + 1}]</span>
              <span className="truncate">{c.ref}</span>
              <span className="opacity-30">·</span>
              <span className="opacity-50">{c.sha?.slice(0, 7) ?? "head"}</span>
            </div>
          ))}
        </div>
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
    <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-tight">
      {children}
    </h2>
  );
}
