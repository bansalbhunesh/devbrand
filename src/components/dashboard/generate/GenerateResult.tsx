import * as React from "react";
import { ExternalLink, ClipboardCopy, Check, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Stat } from "../HistoryCard";
import { scaleIn, springs } from "@/lib/animations";

interface GenerateResultProps {
  result: any;
  selectedPost: number;
  setSelectedPost: (idx: number) => void;
  handleCopy: (text: string, id: string) => void;
  copied: string | null;
  user: any;
  handleUpgrade: () => void;
}

const postLabels = ["Problem / Outcome", "Tradeoff / Decision", "Learnings"];

export const GenerateResult = React.memo(
  ({
    result,
    selectedPost,
    setSelectedPost,
    handleCopy,
    copied,
    user,
    handleUpgrade,
  }: GenerateResultProps) => {
    return (
      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        exit="exit"
        className="space-y-4"
      >
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20 glass-morphism">
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

        <div className="flex gap-2 relative bg-muted/30 p-1 rounded-xl border border-border">
          {postLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => setSelectedPost(i)}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-bold transition-all relative z-10",
                selectedPost === i
                  ? "text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {selectedPost === i && (
                <motion.div
                  layoutId="post-tab-indicator"
                  className="absolute inset-0 bg-foreground rounded-lg -z-10 shadow-lg shadow-foreground/5"
                  transition={springs.snappy}
                />
              )}
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5 relative group/card glow-small">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                LinkedIn post
              </span>
              <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <span className="text-[10px] font-mono text-muted-foreground opacity-60 italic">
                {postLabels[selectedPost]}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  handleCopy(
                    [
                      result.linkedinPost1,
                      result.linkedinPost2,
                      result.linkedinPost3,
                    ][selectedPost],
                    `post-${selectedPost}`,
                  )
                }
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2.5 py-1.5 rounded-lg border border-border hover:border-border-strong bg-background/50"
              >
                {copied === `post-${selectedPost}` ? (
                  <>
                    <Check className="h-3 w-3 text-green-500" /> Copied
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="h-3 w-3" /> Copy Text
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (user?.plan !== "pro") return handleUpgrade();
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/t/${result.slug}`)}`,
                    "_blank",
                  );
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-bold transition px-3 py-1.5 rounded-lg border",
                  user?.plan === "pro"
                    ? "bg-[#0077b5] text-white border-[#0077b5] hover:brightness-110"
                    : "bg-muted text-muted-foreground border-border cursor-not-allowed",
                )}
              >
                {user?.plan === "pro" ? (
                  <>
                    <ExternalLink className="h-3 w-3" /> Post to LinkedIn
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" /> Draft to LinkedIn
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="relative overflow-hidden p-4 rounded-xl bg-background/40 border border-border/50">
            <AnimatePresence mode="wait">
              <motion.p
                key={selectedPost}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="text-sm leading-7 text-pretty whitespace-pre-line font-medium text-foreground/90"
              >
                {
                  [
                    result.linkedinPost1,
                    result.linkedinPost2,
                    result.linkedinPost3,
                  ][selectedPost]
                }
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Resume bullet
            </span>
            <button
              onClick={() => handleCopy(result.resumeBullet, "resume")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
            >
              {copied === "resume" ? (
                <>
                  <Check className="h-3 w-3 text-green-500" /> Copied
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
          </div>
          <p className="text-sm font-mono leading-6 text-foreground/80 text-pretty">
            {result.resumeBullet}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
              Interview hook
            </span>
            <button
              onClick={() => handleCopy(result.interviewHook, "hook")}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
            >
              {copied === "hook" ? (
                <>
                  <Check className="h-3 w-3 text-green-500" /> Copied
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
          </div>
          <p className="text-sm leading-6 italic text-muted-foreground/80 text-pretty">
            {result.interviewHook}
          </p>
        </div>
      </motion.div>
    );
  },
);

GenerateResult.displayName = "GenerateResult";
