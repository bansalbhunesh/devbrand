"use client";

import { useState } from "react";
import { ArrowRight, Check, Link2, Sparkles, GitCommit } from "lucide-react";

const pairs = [
  {
    before: "Fixed API issue.",
    after: (
      <>
        Redesigned <C n={1}>async retry handling</C> to improve backend reliability under{" "}
        <C n={2}>concurrent transaction loads</C>.
      </>
    ),
    tag: "Reliability",
    repo: "payments-svc",
    pr: "#1428",
    citations: [
      { ref: "lib/retry.ts:42",   sha: "a4f1c2" },
      { ref: "queue/worker.ts:118", sha: "a4f1c2" },
    ],
    slug: "9f2c",
  },
  {
    before: "Refactored auth.",
    after: (
      <>
        Migrated session handling from <C n={1}>cookie-bound state to a stateless JWT pipeline</C>,
        cutting <C n={2}>auth latency p95 by 38%</C>.
      </>
    ),
    tag: "Architecture",
    repo: "edge-gateway",
    pr: "#812",
    citations: [
      { ref: "auth/session.ts:1", sha: "7b22ee" },
      { ref: "obs/p95.json:24",   sha: "7b22ee" },
    ],
    slug: "3a71",
  },
  {
    before: "Cleaned up DB queries.",
    after: (
      <>
        Rewrote <C n={1}>N+1 hotspots in the orders service</C> with batched loaders, removing{" "}
        <C n={2}>70% of query volume during peak</C>.
      </>
    ),
    tag: "Performance",
    repo: "orders-api",
    pr: "#377",
    citations: [
      { ref: "loaders/orders.ts:88", sha: "11c0a9" },
      { ref: "metrics/peak.csv:3",   sha: "11c0a9" },
    ],
    slug: "b612",
  },
];

export function DemoTransform() {
  return (
    <section id="demo" className="relative py-28">
      <div className="mx-auto max-w-7xl px-6">
        <SectionLabel>The transformation</SectionLabel>
        <SectionTitle>
          From <span className="font-mono text-muted-foreground">"fixed bug"</span> to a story <br className="hidden md:block" />
          a recruiter actually understands.
        </SectionTitle>
        <p className="mt-5 max-w-xl text-muted-foreground">
          Every line is grounded in real diffs. Click share to send a polished, evidence-backed read of any PR.
        </p>

        <div className="mt-14 grid gap-5">
          {pairs.map((p, i) => <Pair key={i} {...p} />)}
        </div>
      </div>
    </section>
  );
}

function Pair(p: typeof pairs[number]) {
  const [copied, setCopied] = useState(false);
  const url = `devbrand.app/t/${p.slug}`;
  return (
    <div className="group grid md:grid-cols-[1fr_auto_1.4fr] items-stretch gap-0 md:gap-6 rounded-2xl border border-border bg-surface/50 hover:border-border-strong transition overflow-hidden">
      <div className="p-6 md:p-7 border-b md:border-b-0 md:border-r border-border bg-background/40">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          <span>Before</span>
          <span className="font-mono normal-case tracking-normal text-[11px]">{p.repo} · {p.pr}</span>
        </div>
        <p className="font-mono text-sm text-foreground/80">{p.before}</p>
        <div className="mt-5 flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
          <GitCommit className="h-3.5 w-3.5" /> {p.citations[0].sha}
        </div>
      </div>
      <div className="hidden md:flex items-center justify-center px-2">
        <div className="relative">
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue transition" />
          <Sparkles className="absolute -right-2 -top-2 h-2.5 w-2.5 text-blue opacity-0 group-hover:opacity-100 transition" />
        </div>
      </div>
      <div className="p-6 md:p-7 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-blue">After</div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-muted-foreground border border-border rounded-md px-1.5 py-0.5">{p.tag}</span>
            <button
              onClick={() => { navigator.clipboard?.writeText(`https://${url}`); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
              className="text-[10px] inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
            >
              {copied ? <><Check className="h-3 w-3 text-green" /> copied</> : <><Link2 className="h-3 w-3" /> share</>}
            </button>
          </div>
        </div>
        <p className="text-[15px] leading-7 text-pretty">{p.after}</p>
        <div className="mt-4 rounded-lg border border-border bg-background/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Evidence</div>
          <ol className="space-y-1 text-[11px] font-mono text-muted-foreground">
            {p.citations.map((c, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-blue">[{idx + 1}]</span>
                <span className="text-foreground/80">{c.ref}</span>
                <span className="opacity-60">· {c.sha}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-3 text-[11px] font-mono text-muted-foreground">{url}</div>
      </div>
    </div>
  );
}

function C({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="relative">
      <span className="bg-blue/10 text-foreground rounded-[3px] px-0.5 -mx-0.5 ring-1 ring-blue/20">{children}</span>
      <sup className="ml-0.5 text-[10px] font-mono text-blue">[{n}]</sup>
    </span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
      <span className="h-px w-8 bg-border-strong" /> {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.02em] gradient-text text-balance leading-[1.05]">
      {children}
    </h2>
  );
}
