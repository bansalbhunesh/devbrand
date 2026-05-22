import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Gavel, Github, ArrowRight, Activity, Zap } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { motion } from "framer-motion";
import { Reveal, RevealItem, REVEAL_EASE } from "@/components/site/Reveal";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const [repoInput, setRepoInput] = useState("");
  const navigate = useNavigate();

  const handleRoast = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoInput.trim()) {
      navigate({ to: "/roast", search: { target: repoInput.trim() } });
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] selection:bg-amber-500/30">
      <main className="w-full flex flex-col items-center justify-center min-h-[90vh] px-4 text-center relative overflow-hidden">
        {/* Cinematic Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-amber-500/10 blur-[150px] rounded-[100%] pointer-events-none mix-blend-screen opacity-50" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent_80%)] opacity-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center w-full max-w-5xl pt-20">
          <Reveal stagger={0.1} className="flex flex-col items-center">
            <RevealItem>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-8 backdrop-blur-md">
                <Gavel className="h-3 w-3" /> The Judgment Engine Is Live
              </div>
            </RevealItem>
            
            <RevealItem>
              <h1 className="text-5xl md:text-[80px] font-black tracking-tight mb-8 leading-[1.05] text-white">
                Find out if your codebase <br className="hidden md:block" />
                is <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">AI Slop.</span>
              </h1>
            </RevealItem>
            
            <RevealItem>
              <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-14 leading-relaxed font-light">
                Paste a GitHub repository. OBLITERATUS reads the commits, runs the metrics, and renders a brutally honest verdict on your architecture and velocity.
              </p>
            </RevealItem>

            <RevealItem className="w-full max-w-3xl">
              <form onSubmit={handleRoast} className="relative group w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                <div className="relative flex items-center w-full bg-zinc-900/80 border border-zinc-800 rounded-full p-2 backdrop-blur-xl shadow-2xl transition-all focus-within:border-amber-500/50 focus-within:bg-zinc-900">
                  <div className="pl-6 pr-4 text-zinc-500">
                    <Github className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="facebook/react or github.com/owner/repo"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-600 text-lg py-4 font-mono w-full"
                  />
                  <button
                    type="submit"
                    disabled={!repoInput.trim()}
                    className="ml-2 px-8 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    Render Verdict <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </RevealItem>
          </Reveal>

          {/* Social Proof / Metrics */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8, ease: REVEAL_EASE }}
            className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl"
          >
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
              <Activity className="h-5 w-5 text-amber-500 mb-3" />
              <div className="text-zinc-300 font-medium text-sm">Quantifies Tech Debt</div>
              <div className="text-zinc-500 text-xs mt-1">Bus factor & stale PR analysis</div>
            </div>
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
              <Zap className="h-5 w-5 text-amber-500 mb-3" />
              <div className="text-zinc-300 font-medium text-sm">60-Second Ingestion</div>
              <div className="text-zinc-500 text-xs mt-1">Evaluates the last 50 commits</div>
            </div>
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
              <Gavel className="h-5 w-5 text-amber-500 mb-3" />
              <div className="text-zinc-300 font-medium text-sm">Unfiltered Honesty</div>
              <div className="text-zinc-500 text-xs mt-1">No marketing fluff. Just the line.</div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
