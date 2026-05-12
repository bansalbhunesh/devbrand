import * as React from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GenerateForm } from "./generate/GenerateForm";
import { GenerateResult } from "./generate/GenerateResult";
import { GenerateLoading } from "./generate/GenerateLoading";
import { GenerateEmpty } from "./generate/GenerateEmpty";
import { fadeInDown } from "@/lib/animations";

interface GenerateTabProps {
  user: any;
  prUrl: string;
  setPrUrl: (url: string) => void;
  handleGenerate: () => void;
  generating: boolean;
  isFreeLimitReached: boolean;
  handleUpgrade: () => void;
  error: string | null;
  result: any;
  selectedPost: number;
  setSelectedPost: (idx: number) => void;
  handleCopy: (text: string, id: string) => void;
  copied: string | null;
  setTab: (tab: any) => void;
}

export function GenerateTab({
  user,
  prUrl,
  setPrUrl,
  handleGenerate,
  generating,
  isFreeLimitReached,
  handleUpgrade,
  error,
  result,
  selectedPost,
  setSelectedPost,
  handleCopy,
  copied,
  setTab,
}: GenerateTabProps) {
  // Step advances from 0 → 3 based on elapsed real time once `generating`
  // flips true. The engine doesn't emit phase progress (the job-status API
  // returns PROCESSING/COMPLETED/FAILED only), so step here is a UI heuristic
  // that paces with the typical 10-30s engine duration:
  //   step 0: 0-3s       (reading diff)
  //   step 1: 3-9s       (analyzing)
  //   step 2: 9-18s      (scoring)
  //   step 3: 18s+       (synthesizing)
  // It pins at 3 instead of cycling, so a long run doesn't look like it's
  // restarting. Resets to 0 the moment generation ends.
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (!generating) {
      setStep(0);
      return;
    }
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed > 18_000) setStep(3);
      else if (elapsed > 9_000) setStep(2);
      else if (elapsed > 3_000) setStep(1);
      else setStep(0);
    }, 500);
    return () => clearInterval(interval);
  }, [generating]);

  return (
    <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10">
      <div className="space-y-6">
        <GenerateForm
          prUrl={prUrl}
          setPrUrl={setPrUrl}
          handleGenerate={handleGenerate}
          generating={generating}
          isFreeLimitReached={isFreeLimitReached}
          handleUpgrade={handleUpgrade}
          error={error}
        />

        <motion.div
          variants={fadeInDown}
          initial="initial"
          animate="animate"
          className="rounded-xl border border-border bg-muted/30 p-5 space-y-3 glass-morphism"
        >
          <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Your calibration
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Level: </span>
              <span className="capitalize font-medium">{user?.seniority}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tone: </span>
              <span className="capitalize font-medium">{user?.tone}</span>
            </div>
          </div>
          <button
            onClick={() => setTab("settings")}
            className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-medium"
          >
            Adjust in settings <ArrowUpRight className="h-3 w-3" />
          </button>
        </motion.div>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {!result && !generating && <GenerateEmpty key="empty" />}
          {generating && <GenerateLoading key="loading" step={step} />}
          {result && (
            <GenerateResult
              key="result"
              result={result}
              selectedPost={selectedPost}
              setSelectedPost={setSelectedPost}
              handleCopy={handleCopy}
              copied={copied}
              user={user}
              handleUpgrade={handleUpgrade}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
