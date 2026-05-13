import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel,
  Terminal,
  Loader2,
  ShieldAlert,
  Share2,
  UserPlus,
  Check,
  Zap,
} from "lucide-react";
import { getSession } from "@/rpc";
import { generateRoast } from "@/rpc";
import { cn } from "@/lib/utils";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Reveal, RevealItem, REVEAL_EASE } from "@/components/site/Reveal";

export const Route = createFileRoute("/roast-friend")({
  component: RoastFriendPage,
  validateSearch: (search: Record<string, unknown>) => ({
    target: (search.target as string) || "",
  }),
});

function RoastFriendPage() {
  const { target } = Route.useSearch();
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
  });

  const [loading, setLoading] = useState(false);
  const [roastData, setRoastData] = useState<any>(null);
  const [username, setUsername] = useState(target || "");
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const scanLogs = [
    "Identifying target profile in GitHub's registry...",
    "Cross-referencing commit patterns with signal baseline...",
    "Calibrating technical precision for signal report...",
    "Parsing engineering tradeoffs and artifacts...",
    "Generating evidence-backed signal report...",
  ];
  const [scanStep, setScanStep] = useState(0);

  const handleRoast = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    setRoastData(null);

    const interval = setInterval(() => {
      setScanStep((prev) => (prev + 1) % scanLogs.length);
    }, 900);

    try {
      const data = await generateRoast({
        data: { username, userId: session?.id },
      });
      setRoastData(data);
    } catch (err: any) {
      setError(
        err.message.includes("LIMIT_REACHED")
          ? "Verdict limit reached. Upgrade to keep the reports coming."
          : "GitHub didn't like that username. Double-check and try again.",
      );
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const shareUrl = roastData ? `https://devbrand.ai/r/${roastData.id}` : "";
  const tagTweetUrl = roastData
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Hey @${username}, I just generated your GitHub Verdict on DevBrand ✨\n\n"${roastData.card_title}"\n\nSignal Score: ${roastData.roast_score}/100\n\nRead the report:`)}&url=${encodeURIComponent(shareUrl)}`
    : "";
  const challengeTweetUrl = roastData
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I just rendered @${username}'s GitHub Verdict on DevBrand. They scored ${roastData.roast_score}/100 signal.\n\nRender your friend's Verdict next:`)}&url=${encodeURIComponent("https://devbrand.ai/roast-friend")}`
    : "";

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="pt-20">
        <section className="relative py-32 border-t border-border overflow-hidden bg-background">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-amber-500/5 blur-[200px] rounded-full -mt-96 pointer-events-none" />

          <div className="mx-auto max-w-3xl px-6 relative">
            {/* Header */}
            <Reveal stagger={0.1} className="text-center mb-16">
              <RevealItem>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/[0.08] border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-widest mb-6">
                  <UserPlus className="h-3 w-3" /> Verdict a Friend
                </div>
              </RevealItem>
              <RevealItem>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                  {target ? `Reading @${target}` : "Render a Friend's Verdict"}
                </h1>
              </RevealItem>
              <RevealItem>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                  Drop their GitHub username. The engine reads their commit
                  history, names the tradeoffs, and lands a closing line you can
                  tag them on. Evidence included.
                </p>
              </RevealItem>
            </Reveal>

            {/* Input */}
            {!roastData && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: REVEAL_EASE }}
                className="max-w-md mx-auto space-y-6"
              >
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="friends_github_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.trim())}
                    onKeyDown={(e) => e.key === "Enter" && handleRoast()}
                    className="w-full pl-11 pr-4 py-4 rounded-2xl bg-muted/30 border border-border focus:border-amber-500/40 focus:ring-4 focus:ring-amber-500/5 transition outline-none text-sm font-mono"
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-red-500 font-medium overflow-hidden"
                    >
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleRoast}
                  disabled={loading || !username}
                  className="group w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-amber-500 text-background font-bold disabled:opacity-40 transition-all duration-300 shadow-[0_20px_50px_-16px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-16px_rgba(245,158,11,0.5)] disabled:translate-y-0"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Gavel className="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-8deg]" />
                  )}
                  {loading ? scanLogs[scanStep] : "Render the Verdict"}
                </button>
              </motion.div>
            )}

            {/* Result */}
            <AnimatePresence>
              {roastData && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-8"
                >
                  {/* Verdict Card */}
                  <div
                    className={cn(
                      "relative rounded-[2.5rem] border p-10 backdrop-blur-md overflow-hidden",
                      roastData.criticality === "NUCLEAR"
                        ? "bg-amber-500/[0.06] border-amber-500/30"
                        : "bg-muted/20 border-border",
                    )}
                  >
                    <div className="absolute top-[-15%] right-[-10%] h-64 w-64 bg-amber-500/[0.08] blur-[100px] rounded-full" />

                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-3xl font-black text-foreground mb-1">
                          {roastData.card_title}
                        </h2>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          Verdict for @{username}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-amber-400">
                          {roastData.roast_score}
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          Signal Score
                        </p>
                      </div>
                    </div>

                    <p className="text-base text-foreground/95 leading-relaxed whitespace-pre-line border-l-2 border-amber-500/30 pl-6 py-2 mb-8">
                      {roastData.roast}
                    </p>

                    <div className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/5">
                      <div className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em] mb-1">
                        What this profile does well
                      </div>
                      <p className="text-[12px] text-blue-200/80 italic">
                        "{roastData.redeeming_quality}"
                      </p>
                    </div>
                  </div>

                  {/* Share CTAs */}
                  <div className="space-y-4">
                    <p className="text-center text-sm font-bold text-muted-foreground uppercase tracking-widest">
                      Share the Verdict
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <a
                        href={tagTweetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white text-black font-bold transition-all duration-300 shadow-[0_20px_50px_-16px_rgba(255,255,255,0.25)] hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-16px_rgba(255,255,255,0.4)]"
                      >
                        <Zap className="h-5 w-5 text-amber-500 transition-transform duration-300 group-hover:rotate-[-8deg]" />{" "}
                        Tag @{username} on X
                      </a>
                      <a
                        href={challengeTweetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border border-white/10 bg-white/5 font-bold transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5"
                      >
                        <Share2 className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-6" />{" "}
                        Challenge a Friend
                      </a>
                    </div>

                    <div className="flex items-center justify-center gap-4 pt-4">
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-[#0077b5] hover:text-blue-400 transition"
                      >
                        Share on LinkedIn
                      </a>
                      <span className="text-border">|</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(shareUrl);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 1800);
                        }}
                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
                      >
                        {linkCopied ? (
                          <>
                            <Check className="h-3 w-3 text-green-500" /> Copied
                          </>
                        ) : (
                          "Copy Link"
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Chain Roast CTA */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center pt-8 border-t border-border"
                  >
                    <p className="text-muted-foreground text-sm mb-4">
                      Think you can handle it yourself?
                    </p>
                    <button
                      onClick={() => {
                        setRoastData(null);
                        setUsername("");
                      }}
                      className="group inline-flex items-center gap-2 px-8 py-3 rounded-full bg-amber-500 text-background font-bold transition-all duration-300 shadow-[0_18px_40px_-12px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-12px_rgba(245,158,11,0.5)]"
                    >
                      <Gavel className="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-8deg]" />{" "}
                      Render Another Verdict
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
