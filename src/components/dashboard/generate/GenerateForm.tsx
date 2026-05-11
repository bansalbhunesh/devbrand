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
        className="space-y-6"
      >
        <div>
          <h2 className="text-2xl font-semibold tracking-tight mb-1 text-balance">
            Transform a PR
          </h2>
          <p className="text-sm text-muted-foreground text-pretty">
            Paste any GitHub pull request URL to generate LinkedIn posts, resume
            bullets, and interview hooks.
          </p>
        </div>

        {isFreeLimitReached && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 glass-morphism">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  You've used all 3 free generations this month.
                </p>
                <p className="text-xs text-muted-foreground mt-1 text-pretty">
                  Upgrade to Pro for unlimited generations + LinkedIn
                  auto-drafting.
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
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing diff...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-blue-500" /> Generate impact
              story
            </>
          )}
        </button>

        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="text-xs text-destructive font-medium"
          >
            {error === "limit"
              ? "Monthly limit reached. Upgrade to Pro for more."
              : error === "ai"
                ? "AI returned an unexpected format. Please try again."
                : "Something went wrong. Check that the PR URL is public."}
          </motion.p>
        )}
      </motion.div>
    );
  },
);

GenerateForm.displayName = "GenerateForm";
