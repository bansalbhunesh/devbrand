"use client";

import { ShieldCheck, Activity, Search, Code2, Zap, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function InvisibleWork() {
  return (
    <section className="py-32 bg-background relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full -translate-y-1/2 -ml-48" />
      
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-20 items-center">
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-8">
              Deep Analysis
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 leading-[1.1]">
              Quantify the <span className="text-blue-500">invisible</span> work.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10">
              Refactors, security patches, and architectural reviews are the bedrock of high-scale systems, 
              yet they often go unnoticed in performance reviews. DevBrand surfaces these high-leverage 
              signals using our proprietary **ArchScore** engine.
            </p>
            
            <div className="space-y-6">
              <FeatureRow 
                icon={<ShieldCheck className="h-5 w-5 text-green-500" />} 
                title="Security Hardening" 
                desc="Detects path-sensitive security fixes and dependency sanitization." 
              />
              <FeatureRow 
                icon={<Code2 className="h-5 w-5 text-blue-500" />} 
                title="Refactor Density" 
                desc="Calculates cyclomatic complexity reduction across core modules." 
              />
              <FeatureRow 
                icon={<Zap className="h-5 w-5 text-yellow-500" />} 
                title="Force Multipliers" 
                desc="Measures your impact on other engineers through high-value code reviews." 
              />
            </div>
          </div>

          <div className="relative">
            {/* Abstract visualization of a dependency graph */}
            <div className="rounded-[3rem] border border-border bg-muted/20 p-4 md:p-8 backdrop-blur-sm shadow-2xl">
              <div className="aspect-[4/3] relative bg-background rounded-[2rem] border border-border overflow-hidden p-8">
                <div className="absolute inset-0 bg-grid-small opacity-10" />
                
                <div className="relative h-full flex flex-col">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ArchScore Analysis</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground/60">NODE_DEPTH: 14</div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-8 items-center">
                    <div className="space-y-6">
                      <GraphNode active title="auth/middleware.ts" score={84} type="infra" />
                      <GraphNode title="api/routes.ts" score={42} type="utility" />
                      <GraphNode title="ui/button.tsx" score={12} type="leaf" />
                    </div>
                    <div className="relative h-full">
                      {/* Decorative SVG connections */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 100 100">
                        <path d="M 0 25 L 100 50" stroke="currentColor" strokeWidth="0.5" fill="none" />
                        <path d="M 0 50 L 100 50" stroke="currentColor" strokeWidth="0.5" fill="none" />
                        <path d="M 0 75 L 100 50" stroke="currentColor" strokeWidth="0.5" fill="none" />
                      </svg>
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20 shadow-2xl shadow-blue-500/10">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-500">84</div>
                          <div className="text-[8px] font-bold uppercase tracking-widest text-blue-500/60">Core Infra</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 p-4 rounded-xl border border-border bg-muted/10 font-mono text-[10px] text-muted-foreground leading-relaxed">
                    <span className="text-blue-500 font-bold">DETECTION:</span> Identified structural shift in auth layer. 
                    Calculated fan-in increase from 32 to 54. Impact multiplier applied: <span className="text-foreground font-bold">1.8x</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-4 group cursor-default">
      <div className="mt-1 p-2 rounded-lg bg-muted border border-border group-hover:border-blue-500/30 transition-colors">
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-foreground mb-1 flex items-center gap-2">
          {title} <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-all text-blue-500" />
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function GraphNode({ title, score, type, active }: { title: string, score: number, type: string, active?: boolean }) {
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all duration-300",
      active ? "border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/5" : "border-border bg-muted/10 opacity-60"
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-foreground font-bold">{title}</span>
        <span className="text-[10px] font-bold text-blue-500">{score}</span>
      </div>
      <div className="h-1 w-full bg-border rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
