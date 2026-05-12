import * as React from "react";
import { BarChart3, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

export const GenerateEmpty = React.memo(() => {
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-96 rounded-2xl border-2 border-dashed border-border grid place-items-center text-center glass-morphism relative overflow-hidden"
    >
      {/* Soft radial accent so the empty state feels intentional, not blank. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(45% 35% at 50% 40%, rgba(59,130,246,0.06), transparent 75%)",
        }}
      />

      <div className="relative">
        <div className="relative mx-auto mb-4 h-12 w-12 grid place-items-center">
          {/* Concentric breathing rings; cheap, GPU-accelerated, draws the eye. */}
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-blue-500/30"
            animate={{ scale: [1, 1.25, 1.6], opacity: [0.45, 0.15, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-blue-500/30"
            animate={{ scale: [1, 1.25, 1.6], opacity: [0.45, 0.15, 0] }}
            transition={{
              duration: 2.8,
              delay: 1.4,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
          <div className="relative h-12 w-12 rounded-full bg-blue-500/10 border border-blue-500/20 grid place-items-center">
            <BarChart3 className="h-5 w-5 text-blue-500/80" />
          </div>
        </div>
        <p className="text-sm text-foreground/90 font-semibold flex items-center justify-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-blue-500/80" />
          Your impact story appears here
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1.5">
          Paste a PR URL above and we'll do the rest.
        </p>
      </div>
    </motion.div>
  );
});

GenerateEmpty.displayName = "GenerateEmpty";
