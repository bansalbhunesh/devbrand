"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Github, Sparkles, GitPullRequest, Check, Link2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Hero() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  // Cursor-aware glow and 3D parallax
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);

      // 3D Parallax
      const rotateX = (y - r.height / 2) / 25;
      const rotateY = -(x - r.width / 2) / 40;
      setRotation({ x: rotateX, y: rotateY });
    };
    const onLeave = () => setRotation({ x: 0, y: 0 });
    
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 [background:var(--gradient-radial)] pointer-events-none" />
      <div className="absolute inset-0 [background:var(--gradient-mesh)] opacity-60 pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="flex flex-col items-center text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground border border-border-strong rounded-full pl-1 pr-3 py-1 bg-surface/60 backdrop-blur hover:text-foreground transition"
          >
            <span className="rounded-full bg-green/15 text-green px-2 py-0.5 text-[10px] font-medium">NEW</span>
            Developer Wrapped 2025 is live
            <ArrowRight className="h-3 w-3" />
          </Link>

          <h1 className="mt-7 text-5xl md:text-7xl font-semibold tracking-[-0.03em] leading-[1.02] text-balance gradient-text">
            Make invisible engineering<br className="hidden md:block" /> work visible.
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-[1.55] text-muted-foreground text-pretty">
            DevBrand reads your GitHub — every PR, review, and refactor — and turns it into
            posts, resume bullets, and a reputation layer recruiters actually understand.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-foreground text-background font-medium ring-soft hover:opacity-90 transition"
            >
              <Github className="h-4 w-4" /> Connect GitHub
              <ArrowRight className="h-4 w-4 transition -mr-0.5 group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border-strong bg-surface/60 hover:bg-surface text-foreground transition"
            >
              <Sparkles className="h-4 w-4 text-blue" /> Try the live demo
            </a>
          </div>

          <div className="mt-6 flex items-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green" /> 30-second setup</span>
            <span className="hidden sm:flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green" /> Read-only OAuth</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-green" /> Free to start</span>
          </div>
        </div>

        {/* Live transformation preview — cursor-aware */}
        <div
          ref={cardRef}
          className="relative mt-16 md:mt-20 mx-auto max-w-5xl group/card transition-transform duration-200 ease-out"
          style={{ 
            ["--mx" as any]: "50%", 
            ["--my" as any]: "0px",
            transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`
          } as React.CSSProperties}
        >

          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-60 transition"
            style={{
              background:
                "radial-gradient(420px circle at var(--mx) var(--my), color-mix(in oklab, var(--blue) 35%, transparent), transparent 60%)",
            }}
          />
          <div className="relative rounded-2xl bg-surface/70 backdrop-blur-xl border border-border-strong shadow-soft overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-2/50">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
              </div>
              <div className="text-[11px] font-mono text-muted-foreground">devbrand.app/transform/9f2c</div>
              <button
                onClick={() => { navigator.clipboard?.writeText("https://devbrand.app/transform/9f2c"); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
                className="text-[11px] inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
              >
                {copied ? <><Check className="h-3 w-3 text-green" /> link copied</> : <><Link2 className="h-3 w-3" /> share</>}
              </button>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Source PR — evidence side */}
              <div className="p-6 md:p-7">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <GitPullRequest className="h-3.5 w-3.5 text-green" />
                  <span className="font-mono">payments-svc</span>
                  <span>·</span>
                  <a className="hover:text-foreground transition font-mono">#1428</a>
                  <span>·</span>
                  <span>merged</span>
                </div>
                <div className="font-mono text-sm leading-7 text-foreground/90">
                  <span className="text-muted-foreground">title</span> &nbsp;Fix retry on flaky txns<br />
                  <span className="text-green">+428</span>{" "}
                  <span className="text-destructive">−164</span> &nbsp;
                  <span className="text-muted-foreground">across 9 files</span>
                  <div className="mt-4 rounded-lg border border-border bg-background/60 p-3 text-xs leading-6">
                    <span className="text-green">+ </span>retry with jittered exp backoff<br />
                    <span className="text-green">+ </span>idempotency key per attempt<br />
                    <span className="text-green">+ </span>circuit breaker around payments<br />
                    <span className="text-destructive">− </span>blocking sync wait loop
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                    {["lib/retry.ts", "queue/worker.ts", "circuit/breaker.ts"].map((f) => (
                      <span key={f} className="font-mono text-muted-foreground border border-border rounded-md px-1.5 py-0.5">{f}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generated output with citations */}
              <div className="p-6 md:p-7 relative">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Sparkles className="h-3.5 w-3.5 text-blue" /> generated · linkedin post
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground">claude · 1.2s</span>
                </div>
                <p className="text-[15px] leading-7 text-pretty">
                  Redesigned the async retry pipeline behind our payments service —
                  introducing{" "}
                  <Cite n={1}>jittered backoff</Cite>,{" "}
                  <Cite n={2}>idempotency keys per attempt</Cite>, and a{" "}
                  <Cite n={3}>circuit breaker around upstream calls</Cite>. Result: a measurable drop in
                  duplicate charges under concurrent load and a calmer on-call rotation.
                </p>

                <div className="mt-5 rounded-lg border border-border bg-background/40 p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Evidence</div>
                  <ol className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
                    <CiteRow n={1} ref_="lib/retry.ts:42" sha="a4f1c2" />
                    <CiteRow n={2} ref_="queue/worker.ts:118" sha="a4f1c2" />
                    <CiteRow n={3} ref_="circuit/breaker.ts:9" sha="a4f1c2" />
                  </ol>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {["reliability", "payments", "distributed-systems"].map((t) => (
                    <span key={t} className="text-[11px] font-mono text-muted-foreground border border-border rounded-md px-2 py-0.5">#{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* trust strip */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Built for engineers shipping at</p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 opacity-70">
              {["VERCEL", "STRIPE", "LINEAR", "SUPABASE", "GITHUB", "RAYCAST"].map((b) => (
                <span key={b} className="font-mono text-xs tracking-[0.25em] text-muted-foreground">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cite({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <span className="relative">
      <span className="bg-blue/10 text-foreground rounded-[3px] px-0.5 -mx-0.5 ring-1 ring-blue/20">
        {children}
      </span>
      <sup className="ml-0.5 text-[10px] font-mono text-blue">[{n}]</sup>
    </span>
  );
}

function CiteRow({ n, ref_, sha }: { n: number; ref_: string; sha: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="text-blue">[{n}]</span>
      <span className="text-foreground/80">{ref_}</span>
      <span className="opacity-60">·</span>
      <span className="opacity-60">{sha}</span>
    </li>
  );
}
