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
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-96 rounded-2xl border border-border bg-muted/20 p-8 flex flex-col justify-center glass-morphism"
    >
      <div className="space-y-6">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-4 group">
            <div
              className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                i < step
                  ? "bg-blue-500 border-blue-500 text-white"
                  : i === step
                    ? "border-blue-500 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse"
                    : "border-muted text-muted-foreground opacity-30",
              )}
            >
              {i < step ? (
                <Check className="h-3 w-3" />
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
