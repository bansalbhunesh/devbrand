import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Terminal, Loader2, ShieldAlert, Share2 } from "lucide-react";
import { generateRoast } from "@/rpc.server";
import { cn } from "@/lib/utils";
import { Route } from "@/routes/__root";

export function Roast() {
  const { session } = Route.useRouteContext() as { session: any };
  const [loading, setLoading] = useState(false);
  const [roastData, setRoastData] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [tone, setTone] = useState<
    "salty" | "helpful" | "nuclear" | "technical"
  >("salty");

  const scanLogs = [
    "Parsing diff structure [layer0]...",
    "Detecting stack & patterns [layer1]...",
    "Scoring architectural impact [layer2]...",
    "Building evidence citations [layer4]...",
    "Synthesizing career narrative [layer6]...",
    "Calibrating tone & seniority [layer7]...",
    "Precision-engineering insults...",
  ];

  const handleRoast = async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    setRoastData(null);

    // Terminal scanning simulation
    const interval = setInterval(() => {
      setScanStep((prev) => (prev + 1) % scanLogs.length);
    }, 800);

    try {
      const data = await generateRoast({
        data: { username, userId: session?.id, tone },
      });
      setRoastData(data);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message.includes("LIMIT_REACHED")
          ? "Monthly roast limit reached. Upgrade for more judgment."
          : "GitHub didn't like that username or our AI is having a breakdown.",
      );
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <section
      id="roast"
      className="relative py-32 border-t border-border overflow-hidden bg-background"
    >
      <div className="absolute top-0 right-0 w-72 h-72 bg-red-500/5 blur-[50px] rounded-full -mr-32 -mt-32 pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-500 uppercase tracking-widest mb-6">
              Brutal Honesty
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
              Roast a Sacrifice.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10">
              Our AI doesn't just summarize work — it judges it. Roast yourself,
              your lead, or that one friend who still uses `var`.
              Precision-engineered insults backed by real GitHub data.
            </p>

            <div className="space-y-6 max-w-md">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Select Persona
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["salty", "helpful", "nuclear", "technical"] as const).map(
                    (t) => (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={cn(
                          "py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition border",
                          tone === t
                            ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
                            : "bg-muted/30 text-muted-foreground border-border hover:border-red-500/30",
                        )}
                      >
                        {t === "salty"
                          ? "Salty"
                          : t === "helpful"
                            ? "Helpful"
                            : t === "nuclear"
                              ? "☢ Nuclear"
                              : "Technical"}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="relative group">
                <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-red-500 transition-colors" />
                <input
                  type="text"
                  placeholder="github_username_to_sacrifice"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                  onKeyDown={(e) => e.key === "Enter" && handleRoast()}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl bg-muted/30 border border-border focus:border-red-500/40 focus:ring-4 focus:ring-red-500/5 transition outline-none text-sm font-mono"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground/70">
                  <Flame className="h-4 w-4 text-red-500" /> No feelings spared.
                </div>
                <div className="flex items-center gap-3 text-sm font-medium text-foreground/70">
                  <Terminal className="h-4 w-4 text-blue-500" /> Evidence-based
                  insults.
                </div>
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
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 disabled:opacity-40 transition shadow-xl shadow-red-500/20 active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Flame className="h-4 w-4" />
                )}
                Roast Profile
              </button>
            </div>
          </motion.div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-red-500/20 to-transparent blur-xl opacity-10" />
            <motion.div
              layout
              className={cn(
                "relative rounded-[2.5rem] border border-border p-2 backdrop-blur-md shadow-2xl transition-all duration-500",
                roastData?.criticality === "NUCLEAR"
                  ? "bg-red-500/10 border-red-500/40 shadow-red-500/20"
                  : "bg-muted/20",
              )}
            >
              <div className="rounded-[2rem] border border-border bg-background p-8 md:p-10 min-h-[460px] font-mono text-sm leading-8 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full animate-pulse",
                        loading
                          ? "bg-yellow-500"
                          : roastData
                            ? "bg-red-500"
                            : "bg-muted-foreground/30",
                      )}
                    />
                    <span className="text-muted-foreground uppercase tracking-[0.2em] text-[10px] font-bold">
                      Critic.ai_v4.2
                    </span>
                  </div>
                  {roastData && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "text-[10px] font-black px-2 py-1 rounded border uppercase tracking-widest",
                        roastData.criticality === "NUCLEAR"
                          ? "bg-red-500 text-white border-red-500"
                          : "border-red-500/30 text-red-500",
                      )}
                    >
                      {roastData.criticality} CRITICALITY
                    </motion.div>
                  )}
                </div>

                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground"
                      >
                        <Loader2 className="h-12 w-12 animate-spin mb-8 text-red-500" />
                        <div className="space-y-2 text-center">
                          <p className="font-bold tracking-[0.2em] text-[10px] uppercase text-foreground">
                            Analyzing Reputation...
                          </p>
                          <p className="text-[10px] opacity-40 animate-pulse">
                            {scanLogs[scanStep]}
                          </p>
                        </div>
                      </motion.div>
                    ) : roastData ? (
                      <motion.div
                        key="result"
                        initial="hidden"
                        animate="visible"
                        variants={{
                          hidden: { opacity: 0 },
                          visible: {
                            opacity: 1,
                            transition: { staggerChildren: 0.1 },
                          },
                        }}
                        className="space-y-8"
                      >
                        <motion.div
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            visible: { opacity: 1, y: 0 },
                          }}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <h3 className="text-xl font-bold text-red-500 mb-1">
                              {roastData.card_title}
                            </h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              Judgment Card
                            </p>
                          </div>
                          <div className="text-right">
                            <motion.div
                              initial={{ scale: 0.5 }}
                              animate={{ scale: 1 }}
                              className="text-2xl font-black text-foreground"
                            >
                              {roastData.roast_score}%
                            </motion.div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              Hype Level
                            </p>
                          </div>
                        </motion.div>

                        <motion.div
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            visible: { opacity: 1, y: 0 },
                          }}
                          className="grid grid-cols-2 gap-4"
                        >
                          <div className="bg-muted/30 p-4 rounded-2xl border border-border">
                            <div className="text-2xl font-bold text-foreground mb-1">
                              {roastData.technician_score}%
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              Tech Proficiency
                            </p>
                          </div>
                          <div className="bg-muted/30 p-4 rounded-2xl border border-border">
                            <div className="text-2xl font-bold text-red-500 mb-1">
                              {roastData.criticality === "NUCLEAR"
                                ? "99"
                                : "42"}
                              %
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              Ego Threat
                            </p>
                          </div>
                        </motion.div>

                        <motion.p
                          variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1 },
                          }}
                          className="text-foreground text-base leading-relaxed italic border-l-2 border-red-500/20 pl-6 py-2"
                        >
                          "{roastData.roast}"
                        </motion.p>

                        <motion.div
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            visible: { opacity: 1, y: 0 },
                          }}
                          className="space-y-4"
                        >
                          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            <Terminal className="h-3 w-3" /> Recommended
                            Repentance
                          </div>
                          <div className="space-y-3">
                            {roastData.improvements.map(
                              (imp: string, i: number) => (
                                <motion.div
                                  key={i}
                                  variants={{
                                    hidden: { opacity: 0, x: -10 },
                                    visible: { opacity: 1, x: 0 },
                                  }}
                                  className="text-foreground/80 flex gap-3 items-start bg-muted/30 p-3 rounded-xl border border-border group hover:border-red-500/20 transition-colors"
                                >
                                  <span className="text-red-500 font-bold">
                                    0{i + 1}
                                  </span>
                                  <span className="text-[12px] leading-relaxed">
                                    {imp}
                                  </span>
                                </motion.div>
                              ),
                            )}
                          </div>
                        </motion.div>

                        <motion.div
                          variants={{
                            hidden: { opacity: 0, scale: 0.9 },
                            visible: { opacity: 1, scale: 1 },
                          }}
                          className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/5"
                        >
                          <div className="text-[9px] text-blue-500 font-black uppercase tracking-[0.2em] mb-1">
                            One Redeeming Quality
                          </div>
                          <p className="text-[12px] text-blue-500/80 italic">
                            "{roastData.redeeming_quality}"
                          </p>
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col items-center justify-center text-center py-20"
                      >
                        <Flame className="h-12 w-12 text-muted-foreground/20 mb-6" />
                        <p className="text-muted-foreground/40 text-xs font-bold uppercase tracking-widest max-w-[200px]">
                          Waiting for a sacrifice. Enter a username to begin.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {roastData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-10 pt-6 border-t border-border flex flex-col gap-6"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                        Evidence-Backed Judgment
                      </span>
                      <span className="text-[9px] font-bold text-red-500 tracking-[0.3em] animate-pulse uppercase">
                        Live Data
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(roastData.share_summary + "\n\nRoast your lead at: devbrand.ai/roast")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition flex items-center gap-1.5 group"
                      >
                        <Share2 className="h-3.5 w-3.5 group-hover:scale-110 transition" />{" "}
                        Share on X
                      </a>
                      <a
                        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://devbrand.ai/r/" + roastData.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-[#0077b5] hover:text-blue-500 transition flex items-center gap-1.5 group"
                      >
                        <Share2 className="h-3.5 w-3.5 group-hover:scale-110 transition" />{" "}
                        LinkedIn
                      </a>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Hey @${roastData.githubUsername}, I just roasted your GitHub on DevBrand! Check your score: `)}&url=${encodeURIComponent("https://devbrand.ai/r/" + roastData.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-red-500 hover:text-red-400 transition flex items-center gap-1.5 group"
                      >
                        <Flame className="h-3.5 w-3.5 group-hover:animate-bounce" />{" "}
                        Tag them
                      </a>
                      <button
                        onClick={() => {
                          const text = `${roastData.share_summary}\n\nRoast your lead at: devbrand.ai/roast`;
                          navigator.clipboard.writeText(text);
                        }}
                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
                      >
                        Copy Text
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
