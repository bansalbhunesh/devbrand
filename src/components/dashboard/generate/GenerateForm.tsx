import * as React from "react";
import {
  GitPullRequest,
  Loader2,
  Sparkles,
  Zap,
  Lock,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { fadeInDown } from "@/lib/animations";
import { cn } from "@/lib/utils";

// Live URL validity hint — catches obvious typos before the user submits.
// Returns null while the field is empty (no nag on initial state).
function validatePrUrl(url: string): { ok: boolean; hint: string } | null {
  if (!url || url.trim().length === 0) return null;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, hint: "Must start with https://" };
  }
  if (!/github\.com\/[^/]+\/[^/]+\/pull\/\d+/i.test(trimmed)) {
    return {
      ok: false,
      hint: "Should look like github.com/owner/repo/pull/123",
    };
  }
  return { ok: true, hint: "Looks like a valid PR." };
}

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
    const validity = React.useMemo(() => validatePrUrl(prUrl), [prUrl]);
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
                <p className="text-sm font-bold">Quota Exhausted.</p>
                <p className="text-[11px] text-muted-foreground mt-1 text-pretty font-medium leading-relaxed">
                  You've reached your free limit. Upgrade to Pro for unlimited
                  transformations and advanced AI roasting.
                </p>
                <button
                  onClick={handleUpgrade}
                  className="group mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-[0_18px_40px_-16px_rgba(37,99,235,0.6)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-16px_rgba(37,99,235,0.8)]"
                >
                  <Zap className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-[-8deg]" />{" "}
                  Unlock Pro — ₹999
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
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
              aria-invalid={validity?.ok === false || undefined}
              className={cn(
                "w-full pl-12 pr-4 py-4 rounded-2xl bg-white/[0.03] border focus:ring-4 transition-all outline-none text-sm disabled:opacity-40 font-mono placeholder:text-muted-foreground/30 shadow-inner",
                validity?.ok === false
                  ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/5"
                  : "border-white/5 focus:border-blue-500/50 focus:ring-blue-500/5",
              )}
            />
          </div>
          {/* Inline validity hint — appears once the user starts typing, lets
              them course-correct without waiting for a server-side validation
              error after submit. Reserves height so the layout doesn't jump. */}
          <div className="h-4 ml-1">
            {validity && (
              <motion.span
                key={validity.hint}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "text-[10px] font-medium tracking-tight",
                  validity.ok ? "text-blue-500/70" : "text-red-500/80",
                )}
              >
                {validity.hint}
              </motion.span>
            )}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={
            generating ||
            !prUrl.trim() ||
            isFreeLimitReached ||
            validity?.ok === false
          }
          className="group w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.15em] disabled:opacity-40 disabled:translate-y-0 transition-all duration-300 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-16px_rgba(0,0,0,0.65)] border border-white/10"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Neural Parse in
              progress...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-blue-500 transition-transform duration-300 group-hover:rotate-[-8deg]" />{" "}
              Extract Impact Story
            </>
          )}
        </button>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-red-500/5 border border-red-500/15 flex items-start gap-3"
          >
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-0.5">
                Transformation Failed
              </div>
              <div className="text-[11px] text-red-400 font-medium leading-relaxed break-words">
                {prettifyError(error)}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    );

    function prettifyError(raw: string): string {
      // Map known short codes to human strings; fall back to the raw RPC
      // message for anything else (Zod errors etc. arrive that way).
      if (raw === "limit" || raw.includes("LIMIT_REACHED")) {
        return "Monthly limit reached. Upgrade to Pro for unlimited transformations.";
      }
      if (raw === "ai" || raw.includes("ENGINE_TIMEOUT")) {
        return "Neural engine timed out. Try again in a moment — the PR may be unusually large.";
      }
      if (raw.includes("Must be a GitHub PR URL") || raw === "validation") {
        return "Link must be a public GitHub PR (https://github.com/owner/repo/pull/N).";
      }
      if (raw.includes("RATE_LIMIT")) {
        return "Too many requests recently. Give it a minute and try again.";
      }
      return raw;
    }
  },
);

GenerateForm.displayName = "GenerateForm";
