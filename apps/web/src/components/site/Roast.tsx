import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Search, AlertTriangle, CheckCircle2, Flame, Brain, ShieldAlert } from "lucide-react";

export function Roast() {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    { label: "Ingesting Repository", icon: Github },
    { label: "AST Semantic Analysis", icon: Brain },
    { label: "Detecting AI Slop Patterns", icon: Search },
    { label: "Calculating Architectural Ego", icon: AlertTriangle },
    { label: "Finalizing The Verdict", icon: Flame },
  ];

  const handleRoast = () => {
    if (!url) return;
    setIsAnalyzing(true);
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep >= steps.length) {
        clearInterval(interval);
      } else {
        setStep(currentStep);
      }
    }, 1500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-24">
      <div className="text-center mb-16">
        <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
          Get Your <span className="text-orange-500">Repo Roast.</span>
        </h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium">
          The brutally honest truth about your codebase. AI slop detection, architectural debt prediction, and engineering culture analysis.
        </p>
      </div>

      <div className="relative max-w-3xl mx-auto">
        <div className="flex gap-4 p-2 rounded-2xl bg-muted/30 border border-white/10 backdrop-blur-xl">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="flex-1 bg-transparent border-none focus:ring-0 px-4 font-mono text-sm"
          />
          <button
            onClick={handleRoast}
            disabled={isAnalyzing}
            className="px-8 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-900/20 disabled:opacity-50"
          >
            Roast It
          </button>
        </div>

        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 p-8 rounded-3xl border border-white/5 bg-white/5 backdrop-blur-2xl"
            >
              <div className="space-y-8">
                {steps.map((s, i) => {
                  const Icon = s.icon;
                  const isActive = i === step;
                  const isCompleted = i < step;
                  return (
                    <div key={i} className="flex items-center gap-6">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${
                        isActive ? "bg-orange-500/20 text-orange-500 animate-pulse" : 
                        isCompleted ? "bg-green-500/20 text-green-500" : "bg-white/5 text-muted-foreground/30"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-bold tracking-tight ${isActive ? "text-foreground" : "text-muted-foreground/50"}`}>
                          {s.label}
                        </div>
                        {isActive && (
                          <motion.div 
                            layoutId="progress"
                            className="h-1 bg-orange-500 mt-2 rounded-full" 
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.5 }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {step === steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-12 pt-8 border-t border-white/5"
                >
                  <div className="flex items-start gap-4 p-6 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                    <ShieldAlert className="h-6 w-6 text-orange-500 shrink-0" />
                    <div>
                      <h4 className="font-black text-orange-500 uppercase tracking-widest text-[10px] mb-2">The Verdict</h4>
                      <p className="text-foreground font-medium leading-relaxed">
                        "This repository exhibits high architectural ego with a 64% AI-generated slop probability. The maintainability decay suggests a mandatory rewrite within 14 months."
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
