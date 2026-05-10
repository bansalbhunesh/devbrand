"use client";

import { useState } from "react";
import { Flame, Terminal, Loader2 } from "lucide-react";
import { SectionLabel, SectionTitle } from "./DemoTransform";

import { generateRoast } from "@/server/roast";

export function Roast() {
  const [loading, setLoading] = useState(false);
  const [roastData, setRoastData] = useState<any>(null);
  const [username, setUsername] = useState("");

  const handleRoast = async () => {
    if (!username) return;
    setLoading(true);
    try {
      const data = await generateRoast({ data: { username } });
      setRoastData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="roast" className="relative py-28 border-t border-border overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-destructive/10 blur-[120px] rounded-full -mr-64 -mt-64" />
      
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <SectionLabel>The feature you didn't ask for</SectionLabel>
            <SectionTitle>The GitHub Roast.</SectionTitle>
            <p className="mt-5 text-muted-foreground leading-7">
              Our AI doesn't just summarize your work — it judges it. Get a brutally honest
              critique of your commit messages, code structure, and questionable library choices.
            </p>
            <div className="mt-8 space-y-4">
              <input
                type="text"
                placeholder="GitHub username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-surface/50 border border-border focus:border-destructive/40 focus:ring-1 focus:ring-destructive/20 transition outline-none text-sm"
              />
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-sm text-foreground/80">
                  <Flame className="h-4 w-4 text-destructive" /> No feelings spared.
                </div>
                <div className="flex items-center gap-3 text-sm text-foreground/80">
                  <Terminal className="h-4 w-4 text-blue" /> Evidence-based insults.
                </div>
              </div>
            </div>
            <button
              onClick={handleRoast}
              disabled={loading || !username}
              className="mt-10 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 disabled:opacity-50 transition font-medium"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
              Roast my profile
            </button>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-border bg-surface/50 p-1 backdrop-blur-sm shadow-2xl">
              <div className="rounded-xl border border-border bg-background/60 p-6 min-h-[300px] font-mono text-sm leading-7">
                <div className="flex items-center justify-between mb-6 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="text-muted-foreground uppercase tracking-widest text-[10px]">AI-CRITIC-V4</span>
                  </div>
                  {roastData && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-destructive/30 text-destructive">
                      {roastData.criticality}
                    </span>
                  )}
                </div>
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4" />
                    <span>Analyzing your failures...</span>
                  </div>
                ) : roastData ? (
                  <div className="space-y-6">
                    <div className="text-destructive animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {roastData.roast}
                    </div>
                    <div className="space-y-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Recommended Repentance:</div>
                      {roastData.improvements.map((imp: string, i: number) => (
                        <div key={i} className="text-foreground/70 flex gap-2">
                          <span className="text-destructive">▸</span> {imp}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground italic">
                    Waiting for a target...
                  </div>
                )}
                {roastData && (
                  <div className="mt-8 pt-4 border-t border-border flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">EVIDENCE-BACKED JUDGMENT</span>
                    <button className="text-[10px] text-blue hover:underline">Share Roast</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
