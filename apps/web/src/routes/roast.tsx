import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel,
  Loader2,
  ShieldAlert,
  Share2,
  GitBranch,
  Check,
  Zap,
  Github,
  ArrowRight
} from "lucide-react";
import { generateRepoRoast } from "@/rpc";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/site/Footer";
import { Reveal, RevealItem, REVEAL_EASE } from "@/components/site/Reveal";

export const Route = createFileRoute("/roast")({
  component: RepoRoastPage,
  validateSearch: (search: Record<string, unknown>) => ({
    target: (search.target as string) || "",
  }),
});

function RepoRoastPage() {
  const { target } = Route.useSearch();
  const [loading, setLoading] = useState(false);
  const [roastData, setRoastData] = useState<any>(null);
  const [repoInput, setRepoInput] = useState(target || "");
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const scanLogs = [
    "Cloning architectural context...",
    "Parsing codebase slop and tech debt...",
    "Calibrating OBLITERATUS system prompts...",
    "Quantifying the bus factor...",
    "Rendering the final verdict...",
  ];
  const [scanStep, setScanStep] = useState(0);

  const handleRoast = async () => {
    const input = repoInput.trim();
    if (!input) return;
    
    // Parse owner/repo from URL or string
    let owner = "";
    let repoName = "";
    
    try {
      if (input.includes("github.com/")) {
        const parts = new URL(input).pathname.split("/").filter(Boolean);
        owner = parts[0];
        repoName = parts[1];
      } else {
        const parts = input.split("/");
        owner = parts[0];
        repoName = parts[1];
      }
      
      if (!owner || !repoName) throw new Error("Invalid format");
    } catch {
      setError("Please use 'owner/repo' format or a valid GitHub URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setRoastData(null);

    const interval = setInterval(() => {
      setScanStep((prev) => (prev + 1) % scanLogs.length);
    }, 900);

    try {
      const data = await generateRepoRoast({
        data: { owner, repo: repoName },
      });
      setRoastData(data);
    } catch (err: any) {
      setError(
        err.message.includes("LIMIT_REACHED")
          ? "Verdict limit reached. Try again later."
          : "Could not read this repository. Is it public?",
      );
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const shareUrl = roastData ? `https://devbrand.ai/roast?target=${roastData.owner}/${roastData.repo}` : "";
  const shareText = roastData ? encodeURIComponent(`"${roastData.roastData.verdict}"\n\n${roastData.owner}/${roastData.repo} — rated ${roastData.roastData.aiSlopScore}% AI slop\n\nroasted by @devbrand_ai`) : "";
  const tagTweetUrl = roastData ? `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}` : "";
  const challengeTweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just rendered a GitHub Repo Verdict on DevBrand. Roast a codebase next:`)}&url=${encodeURIComponent("https://devbrand.ai/roast")}`;

  return (
    <div className="min-h-screen bg-[#09090b] selection:bg-amber-500/30">
      <main className="w-full flex flex-col items-center justify-start pt-32 min-h-screen px-4 relative overflow-hidden">
        {/* Cinematic Lighting */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-amber-500/5 blur-[150px] rounded-[100%] pointer-events-none mix-blend-screen opacity-60" />
        <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent_80%)] opacity-20 pointer-events-none" />

        <div className="mx-auto max-w-4xl w-full relative z-10">
          <Reveal stagger={0.1} className="text-center mb-12">
            <RevealItem>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-6 backdrop-blur-md">
                <GitBranch className="h-3 w-3" /> The Judgment Engine
              </div>
            </RevealItem>
            <RevealItem>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-white">
                Roast Any Repository
              </h1>
            </RevealItem>
          </Reveal>

          {!roastData && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: REVEAL_EASE }}
              className="max-w-xl mx-auto space-y-6"
            >
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
                    className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-600 text-base py-3 font-mono w-full"
                  />
                  <button
                    type="submit"
                    disabled={loading || !repoInput.trim()}
                    className="ml-2 w-[160px] h-[48px] rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 overflow-hidden relative"
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-2"
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Judging...</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="idle"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center gap-2"
                        >
                          Verdict <ArrowRight className="h-4 w-4" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </button>
                </div>
              </form>

              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex justify-center"
                  >
                    <div className="text-xs font-mono text-amber-500/80 animate-pulse bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
                      {scanLogs[scanStep]}
                    </div>
                  </motion.div>
                )}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium overflow-hidden"
                  >
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          <AnimatePresence>
            {roastData && (
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: REVEAL_EASE }}
                className="space-y-8 w-full pb-32"
              >
                <div
                  className={cn(
                    "relative rounded-[2rem] border p-8 md:p-12 backdrop-blur-2xl overflow-hidden shadow-2xl",
                    roastData.roastData.aiSlopScore > 75
                      ? "bg-amber-500/10 border-amber-500/20"
                      : "bg-zinc-900/60 border-zinc-800",
                  )}
                >
                  {/* Internal Card Glow */}
                  <div className="absolute top-[-20%] right-[-10%] h-96 w-96 bg-amber-500/20 blur-[120px] rounded-full pointer-events-none" />

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 relative z-10">
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
                        {roastData.owner}/<span className="text-amber-500">{roastData.repo}</span>
                      </h2>
                      <p className="text-[11px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
                        Repository Verdict Rendered
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-zinc-950/50 p-2 rounded-2xl border border-zinc-800">
                      <div className="px-6 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
                        <div className="text-3xl font-black text-amber-500 mb-1">
                          {roastData.roastData.aiSlopScore}%
                        </div>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
                          AI Slop
                        </p>
                      </div>
                      <div className="px-6 py-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center">
                        <div className="text-3xl font-black text-blue-400 mb-1">
                          {roastData.roastData.debtScore}%
                        </div>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold">
                          Tech Debt
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-12 relative z-10">
                    <div className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] mb-4">
                      THE LINE
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-white leading-snug tracking-tight border-l-4 border-amber-500 pl-6 py-2 bg-gradient-to-r from-amber-500/5 to-transparent">
                      "{roastData.roastData.verdict}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="p-6 md:p-8 rounded-3xl border border-zinc-800 bg-zinc-900/50 shadow-inner">
                      <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-4">
                        Architecture & Tradeoffs
                      </div>
                      <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-light">
                        {roastData.roastData.narrative}
                      </p>
                    </div>
                    <div className="space-y-6">
                      <div className="p-6 md:p-8 rounded-3xl border border-zinc-800 bg-zinc-900/50 shadow-inner">
                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-4">
                          Execution & Velocity
                        </div>
                        <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-light">
                          {roastData.roastData.executionLog}
                        </p>
                      </div>
                      <div className="p-6 rounded-3xl border border-blue-500/20 bg-blue-500/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                        <div className="text-[10px] text-blue-400 font-black uppercase tracking-[0.2em] mb-3">
                          TL;DR
                        </div>
                        <p className="text-sm md:text-base font-medium text-blue-100 leading-relaxed">
                          {roastData.roastData.minimalist}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Share CTAs */}
                <div className="flex flex-col items-center justify-center space-y-6 pt-4">
                  <p className="text-center text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
                    The Judgment is Final. Share it.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg">
                    <a
                      href={tagTweetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full group flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-white text-black font-bold transition-all duration-300 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:-translate-y-1 hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)]"
                    >
                      <Zap className="h-5 w-5 text-amber-500 transition-transform duration-300 group-hover:scale-110" />{" "}
                      Post on X
                    </a>
                    <button
                      onClick={() => {
                        setRoastData(null);
                        setRepoInput("");
                      }}
                      className="w-full group flex items-center justify-center gap-3 px-6 py-4 rounded-full border border-zinc-700 bg-zinc-800/50 text-white font-bold transition-all duration-300 hover:bg-zinc-800 hover:border-zinc-600 hover:-translate-y-1"
                    >
                      <Gavel className="h-5 w-5 text-zinc-400 transition-transform duration-300 group-hover:-rotate-12" />{" "}
                      Roast Next Repo
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className="text-[11px] font-bold text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5 px-4 py-2 rounded-full hover:bg-zinc-800"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-3 w-3 text-green-500" /> Copied to Clipboard
                      </>
                    ) : (
                      "Copy Direct Link"
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      <Footer />
    </div>
  );
}
