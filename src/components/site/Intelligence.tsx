"use client";

import { Activity, GitBranch, Layers, LineChart, Network, Wrench } from "lucide-react";
import { SectionLabel, SectionTitle } from "./DemoTransform";

const cards = [
  { icon: Activity, title: "Contribution rhythm", body: "When you ship, how steadily, and where your focus actually lives across repos." },
  { icon: Layers, title: "Architecture footprint", body: "What surfaces you touch most: APIs, infra, data, UI — mapped from real diffs." },
  { icon: Network, title: "Collaboration graph", body: "Who you review with, who reviews you, and where you're a quiet force multiplier." },
  { icon: Wrench, title: "Debug & maintenance", body: "Reliability work, refactors, and migrations — the load-bearing work nobody sees." },
  { icon: GitBranch, title: "Strongest repositories", body: "Where your impact compounds, ranked by signal — not just commit count." },
  { icon: LineChart, title: "Recruiter-friendly summary", body: "A clear, evidence-backed paragraph anyone outside engineering can read." },
];

export function Intelligence() {
  return (
    <section id="intelligence" className="relative py-28 border-t border-border">
      <div className="mx-auto max-w-7xl px-6">
        <SectionLabel>GitHub intelligence</SectionLabel>
        <SectionTitle>Your engineering footprint, finally legible.</SectionTitle>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          Not a vanity dashboard. A clear read of how you work, what you ship, and the systems you actually move.
        </p>

        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-border bg-border">
          {cards.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-surface/70 p-7 hover:bg-surface transition group">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg grid place-items-center bg-background border border-border ring-soft">
                  <Icon className="h-4 w-4 text-blue" />
                </div>
                <h3 className="font-medium tracking-tight">{title}</h3>
              </div>
              <p className="mt-4 text-sm text-muted-foreground leading-6">{body}</p>
              <div className="mt-6 h-px divider-soft opacity-0 group-hover:opacity-100 transition" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
