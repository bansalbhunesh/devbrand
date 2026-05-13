"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Github,
  GitMerge,
  Sparkles,
  ArrowRight,
  Webhook,
  Clock,
} from "lucide-react";
import { Reveal, RevealItem, REVEAL_EASE } from "./Reveal";
import { SectionLabel, SectionTitle } from "./DemoTransform";

/**
 * Autonomy — the marketing surface for the merge-webhook → auto-draft
 * pipeline shipped in d23fc92. Positioned above Intelligence because it's
 * the headline shift in product category: from "tool the user opens" to
 * "agent that watches your work". Three-step visual sequence with
 * connector arrows reflects the actual user journey (add repo → merge →
 * draft appears).
 */
export function Autonomy() {
  return (
    <section id="autonomy" className="relative w-full overflow-hidden">
      {/* Ambient glow — softer than the Roast section's red, positioned
          off-axis so it doesn't fight the demo section above. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-0 w-[600px] h-[500px] bg-blue-500/[0.04] blur-[120px] rounded-full -translate-y-1/2"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 w-[500px] h-[400px] bg-purple-500/[0.04] blur-[120px] rounded-full translate-y-1/2"
      />

      <div className="mx-auto max-w-7xl px-6 relative">
        {/* Section header */}
        <Reveal stagger={0.1}>
          <RevealItem>
            <SectionLabel>Autonomous</SectionLabel>
          </RevealItem>
          <RevealItem>
            <SectionTitle>
              Stop pasting PR URLs. <br className="hidden md:block" />
              <span className="text-muted-foreground">
                DevBrand watches your repos.
              </span>
            </SectionTitle>
          </RevealItem>
          <RevealItem>
            <p className="mt-6 max-w-2xl text-muted-foreground text-lg leading-relaxed">
              Hook up a repo once. Every time a pull request merges, the engine
              runs in the background and a draft post lands in your dashboard
              within two minutes — citations and Twitter thread included. You
              review, edit, ship.
            </p>
          </RevealItem>
        </Reveal>

        {/* Three-step sequence */}
        <Reveal
          stagger={0.14}
          rootMargin="-8% 0px"
          className="mt-20 flex md:grid md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-6 md:gap-0 overflow-x-auto pb-8 md:pb-0 scrollbar-hide snap-x snap-mandatory"
        >
          <RevealItem className="min-w-[280px] md:min-w-0 snap-start">
            <Step
              n="01"
              icon={Webhook}
              title="Track the repo"
              caption="Paste owner/repo in your dashboard. We hand you a webhook URL + a 64-char HMAC secret. 30 seconds in GitHub's webhook settings, done forever."
              accent="from-blue-500/15 to-blue-500/0"
              accentBorder="border-blue-500/20"
              accentText="text-blue-300"
            />
          </RevealItem>

          <Connector />

          <RevealItem className="min-w-[280px] md:min-w-0 snap-start">
            <Step
              n="02"
              icon={GitMerge}
              title="Merge a PR"
              caption="Work normally. When the PR closes as merged, GitHub fires the webhook. We verify the signature, dedupe the delivery, and enqueue the 8-layer engine pipeline against your real diff."
              accent="from-purple-500/15 to-purple-500/0"
              accentBorder="border-purple-500/20"
              accentText="text-purple-300"
            />
          </RevealItem>

          <Connector />

          <RevealItem className="min-w-[280px] md:min-w-0 snap-start">
            <Step
              n="03"
              icon={Sparkles}
              title="Draft appears"
              caption="Three LinkedIn variants, a 4–7 tweet thread, a resume bullet, an interview hook, and verifiable citations — sitting in your History tab. Edit inline. Schedule. Ship."
              accent="from-emerald-500/15 to-emerald-500/0"
              accentBorder="border-emerald-500/20"
              accentText="text-emerald-300"
            />
          </RevealItem>
        </Reveal>

        {/* Below-the-fold proof line — concrete latency claim plus a
            citation-style number reinforces "this isn't vapor". */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.7, ease: REVEAL_EASE }}
          className="mt-16 flex flex-wrap items-center gap-6 md:gap-10 text-sm text-muted-foreground"
        >
          <Stat icon={Clock} label="Median draft latency" value="~90s" />
          <Stat icon={GitMerge} label="Per-repo HMAC secret" value="256-bit" />
          <Stat
            icon={Github}
            label="Idempotent retries"
            value="X-GitHub-Delivery"
          />
          <div className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/[0.08] border border-blue-500/20 text-blue-300 text-[10px] font-black tracking-[0.3em] uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-300" />
            </span>
            Pro feature
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  caption,
  accent,
  accentBorder,
  accentText,
}: {
  n: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  caption: string;
  accent: string;
  accentBorder: string;
  accentText: string;
}) {
  return (
    <div
      className={`group relative h-full rounded-[2rem] border ${accentBorder} bg-gradient-to-br ${accent} backdrop-blur-sm p-8 hover:-translate-y-1 hover:shadow-[0_24px_60px_-24px_rgba(59,130,246,0.18)] transition-all duration-500`}
    >
      <div className="flex items-center justify-between mb-8">
        <span
          className={`font-mono text-[10px] font-black tracking-[0.3em] ${accentText}`}
        >
          {n}
        </span>
        <div className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.04] grid place-items-center group-hover:rotate-[-8deg] transition-transform duration-500">
          <Icon className={`h-4 w-4 ${accentText}`} />
        </div>
      </div>
      <h3 className="text-xl font-bold tracking-tight text-foreground mb-3 text-balance">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{caption}</p>
    </div>
  );
}

function Connector() {
  return (
    <div className="hidden md:flex items-center justify-center px-2">
      <div className="relative w-8 h-px bg-gradient-to-r from-white/0 via-white/15 to-white/0">
        <ArrowRight className="absolute -right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg border border-white/10 bg-white/[0.03] grid place-items-center">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/60">
          {label}
        </span>
        <span className="text-sm font-mono font-bold text-foreground/80">
          {value}
        </span>
      </div>
    </div>
  );
}
