import * as React from "react";
import { Sparkles, GitPullRequest, Loader2, Lock, Zap, BarChart3, ExternalLink, ClipboardCopy, Check, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Stat } from "./HistoryCard";

interface GenerateTabProps {
  user: any;
  prUrl: string;
  setPrUrl: (url: string) => void;
  handleGenerate: () => void;
  generating: boolean;
  isFreeLimitReached: boolean;
  handleUpgrade: () => void;
  error: string | null;
  result: any;
  selectedPost: number;
  setSelectedPost: (idx: number) => void;
  handleCopy: (text: string, id: string) => void;
  copied: string | null;
  setTab: (tab: any) => void;
}

export function GenerateTab({
  user,
  prUrl,
  setPrUrl,
  handleGenerate,
  generating,
  isFreeLimitReached,
  handleUpgrade,
  error,
  result,
  selectedPost,
  setSelectedPost,
  handleCopy,
  copied,
  setTab
}: GenerateTabProps) {
  const postLabels = ["Problem / Outcome", "Tradeoff / Decision", "Learnings"];
  const [step, setStep] = React.useState(0);
  const steps = [
    "Reading diff & extracting metadata...",
    "Analyzing architectural significance...",
    "Scoring complexity & impact...",
    "Synthesizing persona-aligned narrative..."
  ];

  React.useEffect(() => {
    if (generating) {
      const interval = setInterval(() => {
        setStep(s => (s < 3 ? s + 1 : s));
      }, 2000);
      return () => {
        clearInterval(interval);
        setStep(0);
      };
    }
  }, [generating]);

  return (
    <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10 animate-in fade-in duration-500">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-1">
            Transform a PR
          </h2>
          <p className="text-sm text-muted-foreground">
            Paste any GitHub pull request URL to generate LinkedIn posts, resume bullets, and interview hooks.
          </p>
        </div>

        {isFreeLimitReached && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">You've used all 3 free generations this month.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upgrade to Pro for unlimited generations + LinkedIn auto-drafting.
                </p>
                <button
                  onClick={handleUpgrade}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:opacity-90 transition shadow-lg shadow-blue-500/20"
                >
                  <Zap className="h-3.5 w-3.5" /> Upgrade to Pro — ₹999
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            PR URL
          </label>
          <div className="relative">
            <GitPullRequest className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="url"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="https://github.com/org/repo/pull/123"
              disabled={isFreeLimitReached}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition outline-none text-sm disabled:opacity-40 font-mono"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !prUrl.trim() || isFreeLimitReached}
          className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-foreground text-background font-bold text-sm hover:opacity-90 disabled:opacity-40 transition shadow-xl shadow-foreground/5"
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing diff...</>
          ) : (
            <><Sparkles className="h-4 w-4 text-blue-500" /> Generate impact story</>
          )}
        </button>

        {error === "limit" && (
          <p className="text-xs text-destructive">Monthly limit reached. Upgrade to Pro for more.</p>
        )}
        {error === "ai" && (
          <p className="text-xs text-destructive">AI returned an unexpected format. Please try again.</p>
        )}
        {error === "generic" && (
          <p className="text-xs text-destructive">Something went wrong. Check that the PR URL is public.</p>
        )}

        <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Your calibration</div>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Level: </span>
              <span className="capitalize font-medium">{user?.seniority}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tone: </span>
              <span className="capitalize font-medium">{user?.tone}</span>
            </div>
          </div>
          <button
            onClick={() => setTab("settings")}
            className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-medium"
          >
            Adjust in settings <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {!result && !generating && (
          <div className="h-96 rounded-2xl border-2 border-dashed border-border grid place-items-center text-center">
            <div>
              <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Your impact story appears here</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Paste a PR URL and click generate</p>
            </div>
          </div>
        )}

        {generating && (
          <div className="h-96 rounded-2xl border border-border bg-muted/20 p-8 flex flex-col justify-center">
            <div className="space-y-6">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-4 group">
                  <div className={cn(
                    "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                    i < step ? "bg-blue-500 border-blue-500 text-white" : 
                    i === step ? "border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse" : 
                    "border-muted text-muted-foreground opacity-30"
                  )}>
                    {i < step ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  </div>
                  <div className={cn(
                    "text-sm font-medium transition-all duration-500",
                    i === step ? "text-foreground translate-x-1" : 
                    i < step ? "text-muted-foreground" : 
                    "text-muted-foreground opacity-30"
                  )}>
                    {s}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
              <div className="flex gap-6 text-sm">
                <Stat label="Impact" value={`${result.impactScore}/100`} />
                <Stat label="Category" value={result.category} />
                <Stat label="Level" value={result.complexityLevel} />
              </div>
              <a
                href={`/t/${result.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 flex items-center gap-1 hover:underline font-bold"
              >
                Share <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="flex gap-2">
              {postLabels.map((label, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedPost(i)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition border",
                    selectedPost === i
                      ? "bg-foreground text-background border-foreground shadow-lg shadow-foreground/5"
                      : "bg-transparent text-muted-foreground border-border hover:border-border-strong"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-5 relative group/card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">LinkedIn post</span>
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                  <span className="text-[10px] font-mono text-muted-foreground opacity-60 italic">{postLabels[selectedPost]}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(
                      [result.linkedinPost1, result.linkedinPost2, result.linkedinPost3][selectedPost],
                      `post-${selectedPost}`
                    )}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2.5 py-1.5 rounded-lg border border-border hover:border-border-strong bg-background/50"
                  >
                    {copied === `post-${selectedPost}` ? (
                      <><Check className="h-3 w-3 text-green-500" /> Copied</>
                    ) : (
                      <><ClipboardCopy className="h-3 w-3" /> Copy Text</>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (user?.plan !== "pro") return handleUpgrade();
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/t/${result.slug}`)}`, '_blank');
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-bold transition px-3 py-1.5 rounded-lg border",
                      user?.plan === "pro" 
                        ? "bg-[#0077b5] text-white border-[#0077b5] hover:brightness-110" 
                        : "bg-muted text-muted-foreground border-border cursor-not-allowed"
                    )}
                  >
                    {user?.plan === "pro" ? (
                       <><ExternalLink className="h-3 w-3" /> Post to LinkedIn</>
                    ) : (
                       <><Lock className="h-3 w-3" /> Draft to LinkedIn</>
                    )}
                  </button>
                </div>
              </div>
              <p className="text-sm leading-7 text-pretty whitespace-pre-line font-medium text-foreground/90 p-4 rounded-xl bg-background/40 border border-border/50">
                {[result.linkedinPost1, result.linkedinPost2, result.linkedinPost3][selectedPost]}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Resume bullet</span>
                <button
                  onClick={() => handleCopy(result.resumeBullet, "resume")}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
                >
                  {copied === "resume" ? <><Check className="h-3 w-3 text-green-500" /> Copied</> : <><ClipboardCopy className="h-3 w-3" /> Copy</>}
                </button>
              </div>
              <p className="text-sm font-mono leading-6 text-foreground/80">{result.resumeBullet}</p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Interview hook</span>
                <button
                  onClick={() => handleCopy(result.interviewHook, "hook")}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
                >
                  {copied === "hook" ? <><Check className="h-3 w-3 text-green-500" /> Copied</> : <><ClipboardCopy className="h-3 w-3" /> Copy</>}
                </button>
              </div>
              <p className="text-sm leading-6 italic text-muted-foreground/80">{result.interviewHook}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
