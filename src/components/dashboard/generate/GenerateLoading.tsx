import * as React from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeIn } from "@/lib/animations";

interface GenerateLoadingProps {
  step: number;
}

const steps = [
  "Reading diff & extracting metadata...",
  "Analyzing architectural significance...",
  "Scoring complexity & impact...",
  "Synthesizing persona-aligned narrative...",
];

export const GenerateLoading = React.memo(({ step }: GenerateLoadingProps) => {
  // Fraction of the connector that should be filled. step=0 → 0%, step=N-1 → 100%.
  const progressPct =
    steps.length > 1
      ? (Math.min(step, steps.length - 1) / (steps.length - 1)) * 100
      : 0;

  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-96 rounded-2xl border border-border bg-muted/20 p-8 flex flex-col justify-center glass-morphism relative overflow-hidden"
    >
      {/* Ambient gradient that breathes — signals "actively working" without
          the noise of the per-step pulse animation. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-40"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 30%, rgba(59,130,246,0.10), transparent 70%)",
        }}
      />

      <div className="space-y-6 relative">
        {/* Vertical connector that fills as steps complete. Centered on the
            6px-wide step indicator (h-6 w-6 → center at 12px). */}
        <div className="absolute left-[11px] top-3 bottom-3 w-[2px] bg-muted/40 rounded-full" />
        <motion.div
          className="absolute left-[11px] top-3 w-[2px] bg-gradient-to-b from-blue-500 to-purple-500 rounded-full origin-top"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: progressPct / 100 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ height: "calc(100% - 24px)" }}
        />

        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-4 group relative">
            <div
              className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-500 bg-background relative z-10",
                i < step
                  ? "bg-blue-500 border-blue-500 text-white"
                  : i === step
                    ? "border-blue-500 text-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.45)]"
                    : "border-muted text-muted-foreground opacity-30",
              )}
            >
              {i < step ? (
                <Check className="h-3 w-3" />
              ) : i === step ? (
                <motion.span
                  className="text-[10px] font-bold"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  {i + 1}
                </motion.span>
              ) : (
                <span className="text-[10px] font-bold">{i + 1}</span>
              )}
            </div>
            <div
              className={cn(
                "text-sm font-medium transition-all duration-500",
                i === step
                  ? "text-foreground translate-x-1"
                  : i < step
                    ? "text-muted-foreground"
                    : "text-muted-foreground opacity-30",
              )}
            >
              {s}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
});

GenerateLoading.displayName = "GenerateLoading";
