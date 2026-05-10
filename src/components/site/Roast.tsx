"use client";

import { useState } from "react";
import { Flame, Terminal, Loader2, Share2, ShieldAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSession } from "@/server/auth";
import { generateRoast } from "@/server/roast";
import { cn } from "@/lib/utils";

export function Roast() {
  const { data: session } = useQuery({ queryKey: ["session"], queryFn: () => getSession() });
  const [loading, setLoading] = useState(false);
  const [roastData, setRoastData] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleRoast = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await generateRoast({ data: { username, userId: session?.id } });
      setRoastData(data);
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("LIMIT_REACHED")) {
        setError("Your monthly roast limit has been reached. Upgrade to Pro for more judgment.");
      } else if (err.message.includes("RATE_LIMIT")) {
        setError("Slow down! Anonymous roasts are limited. Sign in to roast more.");
      } else {
        setError("GitHub didn't like that username or our AI is having an existential crisis.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="roast" className="relative py-32 border-t border-border overflow-hidden bg-background">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-500/5 blur-[140px] rounded-full -mr-64 -mt-64 pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-500 uppercase tracking-widest mb-6">
              Brutal Honesty
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">The GitHub Roast.</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10">
              Our AI doesn't just summarize your work — it judges it. Get a brutally honest
              critique of your commit messages, code structure, and questionable library choices.
            </p>
            
            <div className="space-y-6 max-w-md">
              <div className="relative group">
                <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-red-500 transition-colors" />
                <input
                  type="text"
                  placeholder="github_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                  onKeyDown={(e) => e.key === "Enter" && handleRoast()}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl bg-muted/30 border border-border focus:border-red-500/40 focus:ring-4 focus:ring-red-500/5 transition outline-none text-sm font-mono"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground/70">
                  <Flame className="h-4 w-4 text-red-500" /> No feelings spared.
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-foreground/70">
                  <Terminal className="h-4 w-4 text-blue-500" /> Evidence-based insults.
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-red-500 font-medium">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleRoast}
                disabled={loading || !username}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-40 transition shadow-xl shadow-red-500/20"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                Roast Profile
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-red-500/20 to-transparent blur-3xl opacity-20" />
            <div className="relative rounded-[2.5rem] border border-border bg-muted/20 p-2 backdrop-blur-md shadow-2xl">
              <div className="rounded-[2rem] border border-border bg-background p-8 md:p-10 min-h-[400px] font-mono text-sm leading-8 flex flex-col">
                <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-muted-foreground uppercase tracking-[0.2em] text-[10px] font-bold">Critic.ai_v4.2</span>
                  </div>
                  {roastData && (
                    <div className={cn(
                      "text-[10px] font-black px-2 py-1 rounded border uppercase tracking-widest",
                      roastData.criticality === "NUCLEAR" ? "bg-red-500 text-white border-red-500" : "border-red-500/30 text-red-500"
                    )}>
                      {roastData.criticality} CRITICALITY
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                      <Loader2 className="h-10 w-10 animate-spin mb-6 text-red-500" />
                      <span className="font-bold tracking-widest text-[10px] uppercase">Parsing technical debt...</span>
                    </div>
                  ) : roastData ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold text-red-500 mb-1">{roastData.card_title}</h3>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Judgment Card</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-foreground">{roastData.roast_score}%</div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Hype Level</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/30 p-4 rounded-2xl border border-border">
                          <div className="text-2xl font-bold text-foreground mb-1">{roastData.technician_score}%</div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Tech Proficiency</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-2xl border border-border">
                          <div className="text-2xl font-bold text-red-500 mb-1">{roastData.criticality === 'NUCLEAR' ? '99' : '42'}%</div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Ego Threat</p>
                        </div>
                      </div>

                      <p className="text-foreground text-base leading-relaxed italic">
                        "{roastData.roast}"
                      </p>
                      
                      <div className="space-y-4">
                        <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] flex items-center gap-2">
                          <Terminal className="h-3 w-3" /> Recommended Repentance
                        </div>
                        <div className="space-y-3">
                          {roastData.improvements.map((imp: string, i: number) => (
                            <div key={i} className="text-foreground/80 flex gap-3 items-start bg-muted/30 p-3 rounded-xl border border-border">
                              <span className="text-red-500 font-bold">0{i+1}</span> 
                              <span className="text-[12px] leading-relaxed">{imp}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/5">
                        <div className="text-[9px] text-blue-500 font-black uppercase tracking-[0.2em] mb-1">One Redeeming Quality</div>
                        <p className="text-[12px] text-blue-500/80 italic">"{roastData.redeeming_quality}"</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center py-20">
                      <Flame className="h-12 w-12 text-muted-foreground/20 mb-6" />
                      <p className="text-muted-foreground/40 text-xs font-bold uppercase tracking-widest max-w-[200px]">
                        Waiting for a sacrifice. Enter a username to begin.
                      </p>
                    </div>
                  )}
                </div>

                {roastData && (
                  <div className="mt-10 pt-6 border-t border-border flex justify-between items-center">
                    <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">Evidence-Backed Judgment</span>
                    <div className="flex items-center gap-4">
                      <a 
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(roastData.share_summary + "\n\nGet roasted at: devbrand.ai/roast")}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-600 transition flex items-center gap-1.5 group"
                      >
                        <Share2 className="h-3.5 w-3.5 group-hover:scale-110 transition" /> Share on X
                      </a>
                      <button 
                        onClick={() => {
                          const text = `${roastData.share_summary}\n\nGet roasted at: devbrand.ai/roast`;
                          navigator.clipboard.writeText(text);
                          alert("Copied shareable roast to clipboard!");
                        }}
                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
                      >
                        Copy Text
                      </button>
                    </div>

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
