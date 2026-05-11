import * as React from "react";
import { BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/animations";

export const GenerateEmpty = React.memo(() => {
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-96 rounded-2xl border-2 border-dashed border-border grid place-items-center text-center glass-morphism"
    >
      <div>
        <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground font-medium">
          Your impact story appears here
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Paste a PR URL and click generate
        </p>
      </div>
    </motion.div>
  );
});

GenerateEmpty.displayName = "GenerateEmpty";
