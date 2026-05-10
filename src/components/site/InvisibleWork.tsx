"use client";

import { SectionLabel, SectionTitle } from "./DemoTransform";

const items = [
  { k: "debugging",   t: "The 4-hour root cause hunt",         d: "A 12-line fix that took half a sprint to find. Now part of your story." },
  { k: "refactoring", t: "Removing 2,300 lines of dead code",  d: "Quiet code health work. Counted, contextualized, surfaced." },
  { k: "maintenance", t: "Bumping deps without breaking prod", d: "Boring, load-bearing, real. Translated into impact, not changelogs." },
  { k: "reliability", t: "Cutting on-call pages in half",      d: "The wins that never make a launch post — until now." },
  { k: "infra",       t: "Migrating queues with zero downtime",d: "Risk you absorbed so the team didn't have to." },
];

export function InvisibleWork() {
  return (
    <section className="relative py-28 border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        <SectionLabel>Invisible work</SectionLabel>
        <SectionTitle>The work that keeps everything alive — finally counts.</SectionTitle>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          Most engineering work doesn't ship as a demo. DevBrand reads the diffs nobody promotes
          and turns them into something you can stand behind.
        </p>

        <div className="mt-14 grid md:grid-cols-2 gap-4">
          {items.map((it) => (
            <div key={it.t} className="group relative rounded-xl border border-border bg-surface/50 p-6 hover:border-border-strong transition">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-purple" />
                {it.k}
              </div>
              <h3 className="mt-3 text-lg font-medium tracking-tight">{it.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-6">{it.d}</p>
            </div>
          ))}
          <div className="relative rounded-xl border border-dashed border-border-strong bg-background/40 p-6 grid place-items-center text-center">
            <div>
              <div className="font-mono text-xs text-muted-foreground">+ 142 more contributions</div>
              <div className="mt-1 text-sm text-muted-foreground">extracted from your last 12 months</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
