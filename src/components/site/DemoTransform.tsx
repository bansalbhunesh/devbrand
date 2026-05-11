"use client";

import { useState } from "react";
import { ArrowRight, Check, Link2, Sparkles, GitCommit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDemoOutputs } from "@/rpc.server";
import { cn } from "@/lib/utils";

const fallbackPairs = [
  {
    before: "Fixed API issue in payments worker.",
    after: "Redesigned async retry handling to improve backend reliability under concurrent transaction loads. Implemented exponential jittered backoff.",
    tag: "Reliability",
    repo: "payments-svc",
    pr: "#1428",
    citations: [{ ref: "lib/retry.ts:42", sha: "a4f1c2" }],
    slug: "9f2c",
  },
  {
    before: "Refactored session handling logic.",
    after: "Migrated session handling from cookie-bound state to a stateless JWT pipeline, cutting auth latency p95 by 38% while improving edge scalability.",
    tag: "Architecture",
    repo: "edge-gateway",
    pr: "#812",
    citations: [{ ref: "auth/session.ts:1", sha: "7b22ee" }],
    slug: "3a71",
  },
];

export function DemoTransform() {
  const { data: dbOutputs } = useQuery({
    queryKey: ["demo-outputs"],
    queryFn: () => getDemoOutputs(),
  });

  const displayPairs = dbOutputs?.length 
    ? dbOutputs.map(o => {
        const rawCitations = Array.isArray(o.citations) ? o.citations : [];
        const citations = rawCitations.length > 0 ? rawCitations : [{ ref: "diff", sha: "head" }];
        return {
          before: o.prCommitMessage || "Updated logic and optimized performance.",
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
    <section id="demo" className="relative py-32 bg-muted/[0.03] border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-16">
          <SectionLabel>The transformation</SectionLabel>
          <SectionTitle>
            From <span className="font-mono text-muted-foreground">"fixed bug"</span> to a story <br className="hidden md:block" />
            a recruiter actually understands.
          </SectionTitle>
          <p className="mt-6 max-w-2xl text-muted-foreground text-lg leading-relaxed">
            Every line is grounded in real diffs. DevBrand's engine extracts the strategic value 
            from your technical implementation, creating verifiable proof of impact.
          </p>
        </div>

        <div className="grid gap-6">
          {displayPairs.map((p, i) => <Pair key={i} {...p} />)}
        </div>
      </div>
    </section>
  );
}

function Pair(p: any) {
  const [copied, setCopied] = useState(false);
  const url = `devbrand.app/t/${p.slug}`;
  
  return (
    <div className="group grid md:grid-cols-[1fr_auto_1.4fr] items-stretch gap-0 md:gap-8 rounded-[2.5rem] border border-border bg-muted/20 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 overflow-hidden backdrop-blur-sm">
      <div className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-border bg-background/40">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mb-6">
          <span>BEFORE</span>
          <span className="font-mono normal-case tracking-normal text-[11px] opacity-60">{p.repo} · {p.pr}</span>
        </div>
        <p className="font-mono text-base text-foreground/80 leading-relaxed italic">"{p.before}"</p>
        <div className="mt-8 flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase tracking-widest font-bold">
          <GitCommit className="h-3.5 w-3.5 text-blue-500" /> {p.citations[0]?.sha?.slice(0, 7) ?? "head"}
        </div>
      </div>

      <div className="hidden md:flex items-center justify-center px-2">
        <div className="relative">
          <div className="h-24 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-full p-2 group-hover:border-blue-500/50 transition-colors">
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-all group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>

      <div className="p-8 md:p-10 relative bg-blue-500/[0.02]">
        <div className="flex items-center justify-between mb-6">
          <div className="text-[10px] uppercase tracking-[0.2em] text-blue-500 font-black">AFTER</div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold text-muted-foreground border border-border rounded-lg px-2 py-1 uppercase tracking-widest">{p.tag}</span>
            <button
              onClick={() => { navigator.clipboard?.writeText(`https://${url}`); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
              className="text-[10px] font-bold inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? "COPIED" : "SHARE"}
            </button>
          </div>
        </div>
        <p className="text-[17px] leading-8 text-pretty font-medium text-foreground/90">{p.after}</p>
        
        <div className="mt-8 p-4 rounded-xl border border-blue-500/10 bg-blue-500/[0.03] shadow-inner">
          <div className="text-[9px] uppercase tracking-[0.25em] text-blue-500 font-black mb-3">Verifiable Evidence</div>
          <ol className="space-y-2">
            {p.citations.map((c: any, idx: number) => (
              <li key={idx} className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground">
                <span className="text-blue-500 font-bold">[{idx + 1}]</span>
                <span className="text-foreground/70">{c.ref}</span>
                <span className="opacity-20">·</span>
                <span className="opacity-40">{c.sha?.slice(0, 7) ?? "head"}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-6 text-[10px] font-mono text-muted-foreground/40 font-bold uppercase tracking-widest">{url}</div>
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
