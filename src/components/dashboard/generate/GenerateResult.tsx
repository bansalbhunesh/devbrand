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
        className="space-y-6"
      >
        <div className="flex items-center justify-between p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] glass-morphism relative overflow-hidden">
          <div className="flex gap-8 text-sm">
            <Stat
              label="Impact"
              value={`${result.impactScore}/100`}
              color="text-blue-500"
            />
            <Stat
              label="Complexity"
              value={result.complexityLevel}
              color="text-purple-500"
            />
            <Stat
              label="Category"
              value={result.category}
              color="text-green-500"
            />
          </div>
          <a
            href={`/t/${result.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open public share page"
            className="h-10 w-10 rounded-full bg-white/5 border border-white/10 grid place-items-center hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-12px_rgba(0,0,0,0.5)] transition-all duration-300 group"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>

        <div className="flex gap-2 relative bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
          {postLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => setSelectedPost(i)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all relative z-10",
                selectedPost === i
                  ? "text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {selectedPost === i && (
                <motion.div
                  layoutId="post-tab-indicator"
                  className="absolute inset-0 bg-foreground rounded-xl -z-10 shadow-2xl shadow-foreground/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-1 glass-morphism border-glow">
          <div className="bg-background/80 rounded-[2.4rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-black">
                  Neural Draft Output
                </span>
              </div>
              <div className="flex items-center gap-3">
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
                  aria-label="Copy current post"
                  className="group/copy h-9 w-9 rounded-xl bg-white/5 border border-white/10 grid place-items-center hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-300"
                >
                  {copied === `post-${selectedPost}` ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <ClipboardCopy className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover/copy:rotate-[-8deg]" />
                  )}
                </button>
                <button
                  onClick={() => {
                    handleCopy(
                      [
                        result.linkedinPost1,
                        result.linkedinPost2,
                        result.linkedinPost3,
                      ][selectedPost],
                      `post-${selectedPost}`,
                    );
                    if (user?.plan !== "pro") return handleUpgrade();
                    setTimeout(() => {
                      window.open(
                        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/t/${result.slug}`)}`,
                        "_blank",
                      );
                    }, 500);
                  }}
                  className={cn(
                    "h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border",
                    user?.plan === "pro"
                      ? "bg-[#0077b5] text-white border-[#0077b5] hover:-translate-y-0.5 shadow-[0_12px_30px_-12px_rgba(0,119,181,0.6)] hover:shadow-[0_18px_45px_-12px_rgba(0,119,181,0.8)]"
                      : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-foreground",
                  )}
                >
                  {user?.plan === "pro" ? "Copy & Post" : "Unlock Pro"}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedPost}
                initial={{ opacity: 0, filter: "blur(8px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(8px)" }}
                transition={{ duration: 0.4 }}
                className="text-[15px] leading-[1.8] text-pretty whitespace-pre-line font-medium text-foreground/90 selection:bg-blue-500/30"
              >
                {
                  [
                    result.linkedinPost1,
                    result.linkedinPost2,
                    result.linkedinPost3,
                  ][selectedPost]
                }
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="group rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 glass-morphism hover:border-white/10 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-32px_rgba(59,130,246,0.25)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">
                Resume Artifact
              </span>
              <button
                onClick={() => handleCopy(result.resumeBullet, "resume")}
                aria-label="Copy resume bullet"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied === "resume" ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <ClipboardCopy className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-[-8deg]" />
                )}
              </button>
            </div>
            <p className="text-[13px] font-mono leading-relaxed text-foreground/70">
              {result.resumeBullet}
            </p>
          </div>

          <div className="group rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 glass-morphism hover:border-white/10 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-32px_rgba(168,85,247,0.25)] transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">
                Interview Anchor
              </span>
              <button
                onClick={() => handleCopy(result.interviewHook, "hook")}
                aria-label="Copy interview hook"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied === "hook" ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <ClipboardCopy className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-[-8deg]" />
                )}
              </button>
            </div>
            <p className="text-[13px] italic leading-relaxed text-muted-foreground font-medium">
              "{result.interviewHook}"
            </p>
          </div>
        </div>
      </motion.div>
    );
  },
);

GenerateResult.displayName = "GenerateResult";
