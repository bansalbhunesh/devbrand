import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Gavel, Github, ArrowRight, Activity, Copy, CheckCircle2, Linkedin, Flame } from "lucide-react";
import { Footer } from "@/components/site/Footer";
import { motion, AnimatePresence } from "framer-motion";
import { Reveal, RevealItem, REVEAL_EASE } from "@/components/site/Reveal";
import { createServerFn } from "@tanstack/react-start";
import { completeText } from "@devbrand/ai-sdk";

const generatePost = createServerFn("POST", async (prUrl: string) => {
  if (!prUrl) throw new Error("Missing prUrl");

  const match = prUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
  if (!match) throw new Error("Invalid GitHub PR URL. Must be like https://github.com/owner/repo/pull/123");
  const [, owner, repo, prNumber] = match;

  const prApiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
  const headers: any = { "User-Agent": "DevBrand-App" };
  if (process.env.GITHUB_TOKEN) headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;

  const prRes = await fetch(prApiUrl, { headers });
  if (!prRes.ok) throw new Error("Failed to fetch PR from GitHub");
  const prData = await prRes.json();
  const title = prData.title || "";
  const prBody = prData.body || "";

  const diffRes = await fetch(prApiUrl, {
    headers: { ...headers, "Accept": "application/vnd.github.v3.diff" }
  });
  if (!diffRes.ok) throw new Error("Failed to fetch PR diff from GitHub");
  const diffText = await diffRes.text();
  const truncatedDiff = diffText.length > 20000 ? diffText.slice(0, 20000) + "\n...[DIFF TRUNCATED]..." : diffText;

  const brutalTruthRes = await completeText({
    promptKey: "pr.brutal_truth",
    variables: [title, prBody, truncatedDiff]
  });
  const brutalTruth = brutalTruthRes.text;

  const linkedInSpinRes = await completeText({
    promptKey: "pr.linkedin_spin",
    variables: [title, brutalTruth]
  });
  const linkedInSpin = linkedInSpinRes.text;

  return { brutalTruth, linkedInSpin };
});

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const [prInput, setPrInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ brutalTruth: string; linkedInSpin: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prInput.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await generatePost({ data: prInput.trim() });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.linkedInSpin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] selection:bg-amber-500/30 font-sans">
      <main className="w-full flex flex-col items-center min-h-[90vh] px-4 pt-20 pb-20 relative overflow-hidden">
        {/* Cinematic Lighting */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-amber-500/10 blur-[150px] rounded-[100%] pointer-events-none mix-blend-screen opacity-50" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(white,transparent_80%)] opacity-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center w-full max-w-6xl">
          <Reveal stagger={0.1} className="flex flex-col items-center text-center w-full">
            <RevealItem>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-bold uppercase tracking-[0.2em] mb-8 backdrop-blur-md">
                <Gavel className="h-3 w-3" /> The Judgment Engine
              </div>
            </RevealItem>
            
            <RevealItem>
              <h1 className="text-5xl md:text-[70px] font-black tracking-tight mb-6 leading-[1.05] text-white">
                Turn your PRs into <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">LinkedIn clout.</span>
              </h1>
            </RevealItem>
            
            <RevealItem>
              <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed font-light mx-auto">
                Paste a GitHub Pull Request. OBLITERATUS will give you the Brutal Truth about your code, and then translate it into a corporate, emoji-filled LinkedIn post.
              </p>
            </RevealItem>

            <RevealItem className="w-full max-w-3xl mx-auto">
              <form onSubmit={handleGenerate} className="relative group w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                <div className="relative flex items-center w-full bg-zinc-900/80 border border-zinc-800 rounded-full p-2 backdrop-blur-xl shadow-2xl transition-all focus-within:border-amber-500/50 focus-within:bg-zinc-900">
                  <div className="pl-6 pr-4 text-zinc-500">
                    <Github className="h-5 w-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="https://github.com/owner/repo/pull/123"
                    value={prInput}
                    onChange={(e) => setPrInput(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder:text-zinc-600 text-lg py-4 font-mono w-full"
                  />
                  <button
                    type="submit"
                    disabled={!prInput.trim() || isLoading}
                    className="ml-2 px-8 py-4 rounded-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isLoading ? "Analyzing..." : "Generate Post"} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
              {error && <div className="text-red-400 mt-4 text-sm font-medium">{error}</div>}
            </RevealItem>
          </Reveal>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.6, ease: REVEAL_EASE }}
                className="w-full mt-16 grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* The Brutal Truth */}
                <div className="flex flex-col h-full bg-zinc-900/50 border border-red-900/30 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
                  <div className="bg-red-950/30 border-b border-red-900/30 px-6 py-4 flex items-center gap-3">
                    <Flame className="text-red-500 h-5 w-5" />
                    <h3 className="text-red-400 font-bold uppercase tracking-wider text-sm">The Brutal Truth</h3>
                  </div>
                  <div className="p-6 text-zinc-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {result.brutalTruth}
                  </div>
                </div>

                {/* The LinkedIn Spin */}
                <div className="flex flex-col h-full bg-zinc-900/50 border border-blue-900/30 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl relative">
                  <div className="bg-blue-950/30 border-b border-blue-900/30 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Linkedin className="text-blue-500 h-5 w-5" />
                      <h3 className="text-blue-400 font-bold uppercase tracking-wider text-sm">The LinkedIn Spin</h3>
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold transition-colors"
                    >
                      {copied ? <><CheckCircle2 className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy Post</>}
                    </button>
                  </div>
                  <div className="p-6 text-zinc-200 text-[15px] leading-relaxed whitespace-pre-wrap font-sans">
                    {result.linkedInSpin}
                  </div>
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
