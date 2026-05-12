import * as React from "react";
import { GitPullRequest, Loader2, Sparkles, Zap, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInDown } from "@/lib/animations";

interface GenerateFormProps {
  prUrl: string;
  setPrUrl: (url: string) => void;
  handleGenerate: () => void;
  generating: boolean;
  isFreeLimitReached: boolean;
  handleUpgrade: () => void;
  error: string | null;
}

export const GenerateForm = React.memo(
  ({
    prUrl,
    setPrUrl,
    handleGenerate,
    generating,
    isFreeLimitReached,
    handleUpgrade,
    error,
  }: GenerateFormProps) => {
    return (
      <motion.div
        variants={fadeInDown}
        initial="initial"
        animate="animate"
        className="space-y-8"
      >
        <div>
          <h2 className="text-3xl font-black tracking-tight mb-2 text-balance gradient-text">
            Transform Impact
          </h2>
          <p className="text-[13px] text-muted-foreground/80 text-pretty font-medium leading-relaxed">
            Paste a GitHub PR URL. Our AI extracts the architectural shifts, 
            performance gains, and complexity to build your reputation.
          </p>
        </div>

        {isFreeLimitReached && (
          <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-6 glass-morphism border-glow">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-2xl bg-blue-500/10 grid place-items-center shrink-0">
                <Lock className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">
                  Quota Exhausted.
                </p>
                <p className="text-[11px] text-muted-foreground mt-1 text-pretty font-medium leading-relaxed">
                  You've reached your free limit. Upgrade to Pro for 
                  unlimited transformations and advanced AI roasting.
                </p>
                <button
                  onClick={handleUpgrade}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition shadow-xl shadow-blue-500/20 active:scale-95"
                >
                  <Zap className="h-3.5 w-3.5" /> Unlock Pro — ₹999
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.25em] ml-1">
            Source Artifact (GitHub PR)
          </label>
          <div className="relative group/input">
            <GitPullRequest className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within/input:text-blue-500 transition-colors" />
            <input
              type="url"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="https://github.com/org/repo/pull/123"
              disabled={isFreeLimitReached}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.03] border border-white/5 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none text-sm disabled:opacity-40 font-mono placeholder:text-muted-foreground/30 shadow-inner"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !prUrl.trim() || isFreeLimitReached}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.15em] hover:opacity-90 disabled:opacity-40 transition-all shadow-2xl shadow-foreground/10 active:scale-[0.98] border border-white/10"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Neural Parse in progress...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-blue-500" /> Extract Impact Story
            </>
          )}
        </button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center gap-3"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] text-red-500 font-bold uppercase tracking-widest">
              {error === "limit"
                ? "Monthly limit reached. Upgrade to Pro."
                : error === "ai"
                  ? "Neural Engine failed. Retrying..."
                  : "Validation Error: Link must be public."}
            </span>
          </motion.div>
        )}
      </motion.div>
    );
  },
);

GenerateForm.displayName = "GenerateForm";
