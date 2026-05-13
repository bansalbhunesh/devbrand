import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Terminal,
  Loader2,
  ShieldAlert,
  Share2,
  Gavel,
  Zap,
} from "lucide-react";
import { generateRoast } from "@/rpc";
import { cn } from "@/lib/utils";
import { useRouteContext } from "@tanstack/react-router";
import { Reveal } from "./Reveal";

/**
 * The Verdict — DevBrand's signature shareable artifact. Repositioned
 * from "roast" (humiliation-coded, edgy) to "verdict" (intelligence-
 * coded, premium). Same emotional engine (surprise + ego response +
 * shareability) — different brand surface.
 *
 * Tone gradient (5 stops): mentor / peer / staff / edge / chaos.
 * Default peer. Chaos requires explicit confirmation because it is
 * the only tone that produces a tweet-shaped sharp closing line.
 *
 * Internal schema still uses LOW/MEDIUM/HIGH/NUCLEAR criticality so
 * existing rows in the DB stay valid; the UI relabels them as
 * FAINT/STEADY/STRONG/ELITE signal classes.
 */

type Tone = "mentor" | "peer" | "staff" | "edge" | "chaos";

const TONE_META: Record<Tone, { label: string; hint: string; color: string }> =
  {
    mentor: {
      label: "Mentor",
      hint: "Encouraging, observation-only",
      color: "text-blue-400",
    },
    peer: {
      label: "Peer",
      hint: "Balanced peer review",
      color: "text-emerald-400",
    },
    staff: {
      label: "Staff",
      hint: "Rigorous, technical",
      color: "text-violet-400",
    },
    edge: {
      label: "Edge",
      hint: "Sharp, opinionated",
      color: "text-amber-400",
    },
    chaos: {
      label: "Chaos",
      hint: "Off-record, screenshot-ready",
      color: "text-red-400",
    },
  };

const SIGNAL_LABEL: Record<string, string> = {
  LOW: "Faint",
  MEDIUM: "Steady",
  HIGH: "Strong",
  NUCLEAR: "Elite",
};

export function Roast() {
  const { session } = useRouteContext({ strict: false }) as any;
  const [loading, setLoading] = useState(false);
  const [roastData, setRoastData] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState(0);
  const [tone, setTone] = useState<Tone>("peer");

  // Lines for the in-flight loading panel. Plain-language, no fake DSL.
  const scanLogs = [
    "Reading repos · languages · commit cadence…",
    "Mapping signal across the eight engine layers…",
    "Sampling tradeoffs and growth signals…",
    "Composing the read…",
  ];

  const handleRoast = async () => {
    if (!username) return;

    // Chaos mode is opt-in. Public surfaces default to Peer regardless
    // of how the verdict was authored — Chaos exists for the original
    // requester only, never as a default share-page render.
    if (tone === "chaos") {
      const ok = window.confirm(
        "Chaos mode is off-record. The closing line gets sharp and shareable, " +
          "but everything else stays measured. Public share pages always " +
          "render at Peer tone. Continue?",
      );
      if (!ok) return;
    }

    setLoading(true);
    setError(null);
    setRoastData(null);

    const interval = setInterval(() => {
      setScanStep((prev) => (prev + 1) % scanLogs.length);
    }, 1200);

    try {
      const data = await generateRoast({
        data: { username, userId: session?.id, tone },
      });
      setRoastData(data);
    } catch (err: any) {
      console.error(err);
      setError(
        err.message?.includes("LIMIT_REACHED")
          ? "Monthly Verdict limit reached. Upgrade to keep reading."
          : "Couldn't read that profile — check the GitHub username and try again.",
      );
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const signalLabel = roastData
    ? (SIGNAL_LABEL[roastData.criticality] ?? roastData.criticality)
    : null;

  return (
    <section
      id="roast"
      className="relative py-32 border-t border-border overflow-hidden bg-background"
    >
      <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/[0.04] blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/[0.04] blur-[80px] rounded-full -ml-32 -mb-32 pointer-events-none" />

      <div className="mx-auto max-w-7xl px-6 relative">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <Reveal direction="right" distance={24} duration={0.85}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/[0.08] border border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-6">
              <Gavel className="h-3 w-3" /> Signal, not noise
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8">
              Render the Verdict.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10">
              Point the engine at any GitHub profile — yours, a friend's,
              someone you're considering hiring. We read patterns, name
              tradeoffs, surface one growth direction, and land a closing line
              worth screenshotting. Grounded in real commit data, not vibes.
            </p>

            <div className="space-y-6 max-w-md">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Tone
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(Object.keys(TONE_META) as Tone[]).map((t) => {
                    const meta = TONE_META[t];
                    const isChaos = t === "chaos";
                    const active = tone === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setTone(t)}
                        className={cn(
                          "relative py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition border",
                          active
                            ? "bg-foreground text-background border-foreground shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)]"
                            : "bg-muted/30 text-muted-foreground border-border hover:border-foreground/40",
                          isChaos && !active && "text-red-400/80",
                        )}
                        title={meta.hint}
                      >
                        {isChaos && (
                          <Zap className="absolute top-1 right-1 h-2.5 w-2.5 opacity-50" />
                        )}
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
                <p className={cn("text-[11px]", TONE_META[tone].color)}>
                  {TONE_META[tone].hint}
                  {tone === "chaos" && " — opt-in only."}
                </p>
              </div>

              <div className="relative group">
                <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-amber-400 transition-colors" />
                <input
                  type="text"
                  placeholder="github_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                  onKeyDown={(e) => e.key === "Enter" && handleRoast()}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl bg-muted/30 border border-border focus:border-amber-500/40 focus:ring-4 focus:ring-amber-500/5 transition outline-none text-sm font-mono"
                />
              </div>

              <div className="flex flex-col gap-3 text-sm font-medium text-foreground/70">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-amber-400" /> Read between
                  every commit.
                </div>
                <div className="flex items-center gap-3">
                  <Terminal className="h-4 w-4 text-blue-400" /> Evidence-
                  grounded, never invented.
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-xs text-red-400 font-medium overflow-hidden"
                  >
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleRoast}
                disabled={loading || !username}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-foreground text-background font-bold hover:opacity-90 disabled:opacity-40 transition shadow-[0_20px_50px_-16px_rgba(0,0,0,0.5)] active:scale-[0.98] border border-white/10"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Gavel className="h-4 w-4" />
                )}
                {loading ? "Reading…" : "Render the Verdict"}
              </button>
            </div>
          </Reveal>

          <Reveal
            direction="left"
            distance={24}
            duration={0.85}
            delay={0.1}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-amber-500/[0.08] to-transparent blur-xl opacity-30" />
            <motion.div
              layout
              className={cn(
                "relative rounded-[2.5rem] border p-2 backdrop-blur-md shadow-2xl transition-all duration-500",
                roastData?.criticality === "NUCLEAR"
                  ? "bg-amber-500/[0.06] border-amber-500/30 shadow-amber-500/10"
                  : "bg-muted/20 border-border",
              )}
            >
              <div className="rounded-[2rem] border border-border bg-background p-8 md:p-10 min-h-[460px] font-mono text-sm leading-8 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-2.5 w-2.5 rounded-full animate-pulse",
                        loading
                          ? "bg-amber-500"
                          : roastData
                            ? "bg-emerald-500"
                            : "bg-muted-foreground/30",
                      )}
                    />
                    <span className="text-muted-foreground uppercase tracking-[0.2em] text-[10px] font-bold">
                      DevBrand Verdict · v1
                    </span>
                  </div>
                  {roastData && signalLabel && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "text-[10px] font-black px-2 py-1 rounded border uppercase tracking-widest",
                        roastData.criticality === "NUCLEAR"
                          ? "bg-amber-400 text-background border-amber-400"
                          : "border-amber-500/30 text-amber-400",
                      )}
                    >
                      {signalLabel} Signal
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
                        <Loader2 className="h-12 w-12 animate-spin mb-8 text-amber-400" />
                        <div className="space-y-2 text-center">
                          <p className="font-bold tracking-[0.2em] text-[10px] uppercase text-foreground">
                            Reading the profile…
                          </p>
                          <p className="text-[10px] opacity-50 animate-pulse">
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
                            <h3 className="text-xl font-bold text-foreground mb-1">
                              {roastData.card_title}
                            </h3>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              @{roastData.githubUsername}
                            </p>
                          </div>
                          <div className="text-right">
                            <motion.div
                              initial={{ scale: 0.5 }}
                              animate={{ scale: 1 }}
                              className="text-2xl font-black text-foreground"
                            >
                              {roastData.roast_score}
                            </motion.div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              Signal Score
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
                              {roastData.technician_score}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              Skill Estimate
                            </p>
                          </div>
                          <div className="bg-muted/30 p-4 rounded-2xl border border-border">
                            <div className="text-2xl font-bold text-amber-400 mb-1">
                              {signalLabel ?? "—"}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              Signal Class
                            </p>
                          </div>
                        </motion.div>

                        <motion.p
                          variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1 },
                          }}
                          className="text-foreground text-base leading-relaxed italic border-l-2 border-amber-500/30 pl-6 py-2 whitespace-pre-line"
                        >
                          {roastData.roast}
                        </motion.p>

                        {Array.isArray(roastData.improvements) &&
                          roastData.improvements.length > 0 && (
                            <motion.div
                              variants={{
                                hidden: { opacity: 0, y: 10 },
                                visible: { opacity: 1, y: 0 },
                              }}
                              className="space-y-4"
                            >
                              <div className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <Terminal className="h-3 w-3" /> Next moves
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
                                      className="text-foreground/80 flex gap-3 items-start bg-muted/30 p-3 rounded-xl border border-border group hover:border-amber-500/20 transition-colors"
                                    >
                                      <span className="text-amber-400 font-bold">
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
                          )}

                        {roastData.redeeming_quality && (
                          <motion.div
                            variants={{
                              hidden: { opacity: 0, scale: 0.9 },
                              visible: { opacity: 1, scale: 1 },
                            }}
                            className="p-4 rounded-xl border border-blue-500/10 bg-blue-500/5"
                          >
                            <div className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em] mb-1">
                              What this profile does well
                            </div>
                            <p className="text-[12px] text-blue-200/80 italic">
                              "{roastData.redeeming_quality}"
                            </p>
                          </motion.div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full flex flex-col items-center justify-center text-center py-20"
                      >
                        <Gavel className="h-12 w-12 text-muted-foreground/20 mb-6" />
                        <p className="text-muted-foreground/40 text-xs font-bold uppercase tracking-widest max-w-[240px]">
                          Awaiting a profile. Enter a GitHub username to render
                          the Verdict.
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
                        Evidence-backed read
                      </span>
                      <span className="text-[9px] font-bold text-amber-400 tracking-[0.3em] animate-pulse uppercase">
                        Live signal
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(roastData.share_summary + "\n\nGet your Verdict at devbrand.ai")}`}
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
                      <button
                        onClick={() => {
                          const text = `${roastData.share_summary}\n\nGet your Verdict: devbrand.ai`;
                          navigator.clipboard.writeText(text);
                        }}
                        className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
                      >
                        Copy summary
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
