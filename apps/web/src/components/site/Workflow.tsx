"use client";

import { motion } from "framer-motion";
import {
  GitBranch,
  ListChecks,
  Share2,
  ArrowRight,
  Github,
} from "lucide-react";
import { SectionLabel, SectionTitle } from "./DemoTransform";
import { REVEAL_EASE } from "./Reveal";

const steps = [
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "Ingest",
    description:
      "Connect your GitHub account and select the repositories that hold your best architectural work.",
    color: "blue",
    mockup: (
      <div className="space-y-3 p-6 bg-muted/20 rounded-2xl border border-white/5 font-mono text-[11px]">
        <div className="flex items-center justify-between p-3 rounded-xl bg-background border border-border">
          <div className="flex items-center gap-3">
            <Github className="h-4 w-4 opacity-50" />
            <span>payments-worker-service</span>
          </div>
          <div className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[9px]">
            CONNECTED
          </div>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50 opacity-60">
          <div className="flex items-center gap-3">
            <Github className="h-4 w-4 opacity-50" />
            <span>legacy-auth-v1</span>
          </div>
          <button className="px-2 py-0.5 rounded border border-border hover:bg-white/5 transition">
            CONNECT
          </button>
        </div>
        <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/50 opacity-60">
          <div className="flex items-center gap-3">
            <Github className="h-4 w-4 opacity-50" />
            <span>infra-terraform-config</span>
          </div>
          <button className="px-2 py-0.5 rounded border border-border hover:bg-white/5 transition">
            CONNECT
          </button>
        </div>
      </div>
    ),
  },
  {
    icon: <ListChecks className="h-5 w-5" />,
    title: "Curate",
    description:
      "Select the specific Pull Requests that showcase your growth. DevBrand analyzes the raw diffs automatically.",
    color: "purple",
    mockup: (
      <div className="space-y-3 p-6 bg-muted/20 rounded-2xl border border-white/5 font-mono text-[11px]">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-purple-500/30">
          <div className="h-4 w-4 rounded border border-purple-500 bg-purple-500/20 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
          </div>
          <div className="flex-1">
            <div className="text-foreground">
              feat: implement retry-worker jitter
            </div>
            <div className="text-[9px] text-muted-foreground">
              #1428 · payments-worker
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-purple-500/30">
          <div className="h-4 w-4 rounded border border-purple-500 bg-purple-500/20 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-purple-500" />
          </div>
          <div className="flex-1">
            <div className="text-foreground">
              refactor: move auth to edge worker
            </div>
            <div className="text-[9px] text-muted-foreground">
              #812 · edge-gateway
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50 opacity-60">
          <div className="h-4 w-4 rounded border border-border" />
          <div className="flex-1">
            <div className="text-foreground">chore: update docs</div>
            <div className="text-[9px] text-muted-foreground">
              #1429 · payments-worker
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <Share2 className="h-5 w-5" />,
    title: "Export",
    description:
      "Convert raw code into strategic narratives for LinkedIn, Resume bullets, or your personal Signal Profile.",
    color: "green",
    mockup: (
      <div className="p-6 bg-muted/20 rounded-2xl border border-white/5 font-mono text-[11px] space-y-4">
        <div className="p-4 rounded-xl bg-background border border-green-500/20">
          <div className="text-[9px] text-green-500/60 mb-2 uppercase tracking-widest font-bold italic">
            Generated Signal
          </div>
          <p className="text-foreground/80 leading-relaxed italic">
            "Migrated session handling to a stateless JWT pipeline, reducing
            latency p95 by 38%..."
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center gap-2 text-blue-400">
            <Share2 className="h-3 w-3" /> LinkedIn
          </div>
          <div className="flex-1 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-muted-foreground">
            <ArrowRight className="h-3 w-3" /> Resume
          </div>
        </div>
      </div>
    ),
  },
];

export function Workflow() {
  return (
    <section
      id="workflow"
      className="relative border-t border-border overflow-hidden snap-start snap-always w-full"
    >
      <div className="mx-auto max-w-7xl px-6 h-full flex flex-col justify-center">
        <div className="mb-20">
          <SectionLabel>The Workflow</SectionLabel>
          <SectionTitle>
            Your code is already there. <br className="hidden md:block" />
            We just make it <span className="text-blue-500">legible</span>.
          </SectionTitle>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Connector Line (Desktop) */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent hidden md:block -translate-y-1/2 z-0" />

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.8, ease: REVEAL_EASE }}
              viewport={{ once: true }}
              className="relative z-10 space-y-8"
            >
              <div className="space-y-4">
                <div
                  className={`h-12 w-12 rounded-2xl bg-${step.color}-500/10 border border-${step.color}-500/20 flex items-center justify-center text-${step.color}-500 shadow-[0_0_20px_rgba(var(--${step.color}-500-rgb),0.1)]`}
                >
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed h-16">
                  {step.description}
                </p>
              </div>

              <div className="group relative">
                <div className="absolute -inset-2 bg-gradient-to-b from-white/5 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {step.mockup}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-24 text-center">
          <p className="text-sm text-muted-foreground font-medium mb-8">
            Ready to reclaim your technical reputation?
          </p>
          <button className="px-8 py-4 rounded-2xl bg-foreground text-background font-black hover:opacity-90 transition-all shadow-[0_24px_60px_-16px_rgba(255,255,255,0.15)] active:scale-95">
            Connect GitHub to Start
          </button>
        </div>
      </div>
    </section>
  );
}
