"use client";

import { Cpu, Shield, GitBranch, Terminal } from "lucide-react";
import { motion } from "framer-motion";

const capabilities = [
  {
    icon: <Cpu className="h-5 w-5 text-purple-500" />,
    title: "Stack Detection",
    desc: "Automatically identifies 40+ languages and frameworks including distributed system patterns.",
  },
  {
    icon: <Shield className="h-5 w-5 text-blue-500" />,
    title: "Evidence Citations",
    desc: "Every AI-generated claim is backed by a verifiable file path, line number, and commit SHA.",
  },
  {
    icon: <GitBranch className="h-5 w-5 text-green-500" />,
    title: "Contextual Awareness",
    desc: "Understands repository structure to distinguish between minor tweaks and core logic shifts.",
  },
];

export function Intelligence() {
  return (
    <section
      id="intelligence"
      className="py-32 border-t border-border bg-muted/5 relative"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-6">
            Neural Engine
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">
            Intelligence without the hype.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            We don't use AI to write code. We use it to explain the value of the
            code you already wrote. DevBrand's engine is calibrated for
            engineering precision, not marketing fluff.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {capabilities.map((cap, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-8 rounded-3xl border border-border bg-background hover:border-purple-500/30 transition-all hover:shadow-2xl hover:shadow-purple-500/5"
            >
              <div className="mb-6 p-3 rounded-2xl bg-muted border border-border w-fit group-hover:bg-purple-500/5 group-hover:border-purple-500/20 transition-colors">
                {cap.icon}
              </div>
              <h3 className="text-lg font-bold mb-3">{cap.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {cap.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-20 rounded-3xl border border-border bg-background overflow-hidden shadow-2xl">
          <div className="grid md:grid-cols-[1fr_1.5fr]">
            <div className="p-10 bg-purple-500/5 border-r border-border">
              <div className="text-[10px] font-bold uppercase tracking-widest text-purple-500 mb-6">
                Prompt Architecture
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                Our system prompts are strictly tuned to avoid hype cycles. We
                enforce a "no-emoji, no-enthusiasm" policy, focusing purely on
                architectural impact and quantifiable outcomes.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs font-mono text-foreground/70">
                  <Terminal className="h-3.5 w-3.5 text-purple-500" /> Grounded
                  in diffs
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-foreground/70">
                  <Terminal className="h-3.5 w-3.5 text-purple-500" />{" "}
                  Evidence-first logic
                </div>
                <div className="flex items-center gap-3 text-xs font-mono text-foreground/70">
                  <Terminal className="h-3.5 w-3.5 text-purple-500" /> Zero
                  hallucination
                </div>
              </div>
            </div>
            <div className="p-2 md:p-8 bg-muted/20">
              <div className="rounded-2xl border border-border bg-background p-6 font-mono text-[11px] leading-7 shadow-inner relative group">
                <div className="text-purple-500/50 mb-4 tracking-widest uppercase flex items-center justify-between">
                  <span>System Prompt V1.2</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                </div>
                <div className="space-y-2 text-muted-foreground">
                  <TypewriterText text="SET analyst_mode = PRECISE" delay={0} />
                  <TypewriterText
                    text="ENFORCE citation_model = TRUE"
                    delay={1.5}
                  />
                  <TypewriterText
                    text='FORBID buzzwords = ["game-changer", "revolutionary"]'
                    delay={3}
                  />
                  <TypewriterText
                    text="PRIORITIZE structural_impact = TRUE"
                    delay={4.5}
                  />

                  <div className="h-px bg-border my-6" />

                  <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 6 }}
                    className="text-foreground/60 italic"
                  >
                    "Identify the core problem solved. If a refactor reduces
                    complexity but adds zero features, weight it 2x higher than
                    a feature-layer update."
                  </motion.p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const letters = Array.from(text);
  return (
    <p>
      {letters.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            delay: delay + i * 0.03,
            duration: 0.01,
          }}
          className={
            char === "=" || char === "[" || char === "]" || char === '"'
              ? "text-purple-500/50"
              : ""
          }
        >
          {char}
        </motion.span>
      ))}
    </p>
  );
}
