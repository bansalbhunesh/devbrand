import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Copy, Check, Sparkles, RefreshCcw, Edit2, Zap, BrainCircuit, Linkedin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateDigest, listDigests, getDigest, rewritePost } from "@/rpc";

export function DigestTab() {
  const qc = useQueryClient();
  const [activeVersion, setActiveVersion] = useState(0);
  const [copied, setCopied] = useState(false);

  // We fetch the list and just focus on the MOST RECENT weekly digest
  const { data: digests, isLoading: listLoading } = useQuery({
    queryKey: ["digests"],
    queryFn: async () => await listDigests(),
  });

  const latestDigest = digests?.[0];

  const detail = useQuery({
    queryKey: ["digest", latestDigest?.id],
    queryFn: async () => await getDigest({ data: latestDigest!.id }),
    enabled: !!latestDigest?.id,
  });

  const generate = useMutation({
    mutationFn: async () => {
      const untilDate = new Date();
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 7);

      return await generateDigest({
        data: {
          kind: "weekly",
          since: sinceDate as any,
          until: untilDate as any,
        } as any,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["digests"] });
      toast.success("Meaning extracted.");
    },
    onError: () => toast.error("Generation failed. Check your PRs."),
  });

  const rewrite = useMutation({
    mutationFn: async ({ instruction, text }: { instruction: "shorter" | "technical", text: string }) => {
      return await rewritePost({ data: { text, instruction } });
    },
    onSuccess: (data) => {
      // In a real app we'd optimistically update the react-query cache
      // For this UI, we'll just show it in a toast or update local state if we had it.
      // To keep it simple, we'll just alert that rewrite isn't persisted yet for MVP
      // But let's actually just update the react-query cache for the current digest!
      qc.setQueryData(["digest", latestDigest?.id], (old: any) => {
        if (!old) return old;
        const newOptions = [...old.postOptions];
        newOptions[activeVersion] = data.text;
        return { ...old, postOptions: newOptions };
      });
      toast.success("Post refined.");
    },
    onError: () => toast.error("Refinement failed."),
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Ready to share.");
    });
  };

  if (listLoading) {
    return (
      <div className="h-64 grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
      </div>
    );
  }

  const result = detail.data;

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in duration-700">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">
            What mattered this week
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Thoughtful, authentic engineering narrative. No hype.
          </p>
        </div>
        <button
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {generate.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {digests?.length ? "Regenerate" : "Generate First Update"}
        </button>
      </header>

      {!result ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
          <p className="text-sm text-muted-foreground">
            No updates yet. Build quietly, and check back on Friday.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Post Versions Toggle */}
          <div className="flex gap-2">
            {result.postOptions?.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveVersion(i)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300",
                  activeVersion === i
                    ? "bg-foreground text-background"
                    : "bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                Version {i + 1}
              </button>
            ))}
          </div>

          {/* The Content Card */}
          <motion.div
            key={activeVersion}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-2xl"
          >
            <div className="p-8 md:p-10 font-mono text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
              {result.postOptions?.[activeVersion] ?? "Generating meaning..."}
            </div>
            
            {/* Action Bar */}
            <div className="border-t border-white/5 bg-black/20 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => rewrite.mutate({ instruction: "shorter", text: result.postOptions[activeVersion] })}
                  disabled={rewrite.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Shorter
                </button>
                <button
                  onClick={() => rewrite.mutate({ instruction: "technical", text: result.postOptions[activeVersion] })}
                  disabled={rewrite.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <BrainCircuit className="h-3.5 w-3.5" />
                  More technical
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCopy(result.postOptions[activeVersion])}
                  className={cn(
                    "inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300",
                    copied
                      ? "bg-green-500/10 text-green-400"
                      : "bg-white text-black hover:bg-white/90"
                  )}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Linkedin className="h-4 w-4" />}
                  {copied ? "Copied" : "Share"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
