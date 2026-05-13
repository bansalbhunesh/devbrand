import {
  createFileRoute,
  redirect,
  Link,
  useMatches,
} from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  GitPullRequest,
  Users,
  BarChart3,
  Loader2,
  LogOut,
  Shield,
  Github,
  Calendar,
  CalendarClock,
} from "lucide-react";
import {
  getSession,
  logout,
  updateUserSettings,
  transformPR,
  getUserOutputs,
  createCheckoutSession,
  createBillingPortal,
  verifyPayment,
  getJobStatus,
  getOutputBySlug,
  listScheduledPosts,
} from "@/rpc";
import { cn } from "@/lib/utils";

import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/" });
  },
  component: Dashboard,
});

type Tab =
  | "generate"
  | "history"
  | "digest"
  | "scheduled"
  | "repos"
  | "teams"
  | "settings"
  | "security";

import { Suspense, lazy } from "react";

const GenerateTab = lazy(() =>
  import("@/components/dashboard/GenerateTab").then((m) => ({
    default: m.GenerateTab,
  })),
);
const HistoryTab = lazy(() =>
  import("@/components/dashboard/HistoryTab").then((m) => ({
    default: m.HistoryTab,
  })),
);
const DigestTab = lazy(() =>
  import("@/components/dashboard/DigestTab").then((m) => ({
    default: m.DigestTab,
  })),
);
const TeamsTab = lazy(() =>
  import("@/components/dashboard/TeamsTab").then((m) => ({
    default: m.TeamsTab,
  })),
);
const SettingsTab = lazy(() =>
  import("@/components/dashboard/SettingsTab").then((m) => ({
    default: m.SettingsTab,
  })),
);
const SecurityTab = lazy(() =>
  import("@/components/dashboard/SecurityTab").then((m) => ({
    default: m.SecurityTab,
  })),
);
const TrackedReposTab = lazy(() =>
  import("@/components/dashboard/TrackedReposTab").then((m) => ({
    default: m.TrackedReposTab,
  })),
);
const ScheduledTab = lazy(() =>
  import("@/components/dashboard/ScheduledTab").then((m) => ({
    default: m.ScheduledTab,
  })),
);

function Dashboard() {
  const matches = useMatches();
  const user = (matches.find((m) => m.id === "__root")?.context as any)
    ?.session;
  const [tab, setTab] = useState<Tab>("generate");
  const [prUrl, setPrUrl] = useState("");
  const [result, setResult] = useState<any>(null);
  const [selectedPost, setSelectedPost] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [seniority, setSeniority] = useState(user?.seniority ?? "mid");
  const [tone, setTone] = useState(user?.tone ?? "direct");

  const qc = useQueryClient();

  const { data: outputs, isLoading: outputsLoading } = useQuery({
    queryKey: ["outputs", user?.id],
    queryFn: async () => {
      const res = await getUserOutputs();
      return res as any;
    },
    enabled: !!user && tab === "history",
  });

  const isFreeLimitReached =
    user?.plan === "free" && (user?.generationsThisMonth ?? 0) >= 3;

  // Cancellation token for the current poll loop. A new generate or an
  // unmount flips this; in-flight polls check it before scheduling the next
  // tick. Prevents duplicate polling loops when the user clicks Generate twice,
  // and stops polling after the tab unmounts (was leaking timers).
  const pollAbortRef = useRef<{ cancelled: boolean } | null>(null);

  useEffect(() => {
    return () => {
      if (pollAbortRef.current) pollAbortRef.current.cancelled = true;
    };
  }, []);

  // Surface "post is ready to share" notifications on dashboard load. Each
  // ready post is tracked once per browser via localStorage so re-mounts
  // (router navigation) don't keep re-toasting the same item.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = (await listScheduledPosts()) as any;
        if (cancelled) return;
        const ready: any[] = (res?.posts ?? []).filter(
          (p: any) => p.status === "READY",
        );
        if (ready.length === 0) return;
        const storageKey = `devbrand:seen-ready:${user.id}`;
        let seen = new Set<string>();
        try {
          const raw = window.localStorage.getItem(storageKey);
          if (raw) seen = new Set(JSON.parse(raw));
        } catch {
          // fall through with empty set — corrupt localStorage shouldn't
          // suppress the toast forever.
        }
        const fresh = ready.filter((p) => !seen.has(p.id));
        if (fresh.length === 0) return;
        toast.success(
          fresh.length === 1
            ? "1 post ready to share"
            : `${fresh.length} posts ready to share`,
          { action: { label: "View", onClick: () => setTab("scheduled") } },
        );
        for (const p of fresh) seen.add(p.id);
        try {
          window.localStorage.setItem(
            storageKey,
            JSON.stringify([...seen].slice(-200)),
          );
        } catch {
          // localStorage full / disabled — swallow; worst case is a repeat toast.
        }
      } catch {
        // Unauthorized / network glitch — silently skip; the user will see
        // their ready list inside the Scheduled tab anyway.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleGenerate = async () => {
    if (!prUrl.trim() || !user) return;

    // Cancel any prior in-flight poll loop (e.g. user clicked Generate twice).
    if (pollAbortRef.current) pollAbortRef.current.cancelled = true;
    const token = { cancelled: false };
    pollAbortRef.current = token;

    setError(null);
    setResult(null);
    setGenerating(true);

    try {
      const { jobId } = (await transformPR({
        data: { prUrl: prUrl.trim(), userId: user.id },
      })) as any;

      // Bounded backoff: ramps from 1.5s → 4s over the typical 10-30s engine
      // run; caps total wait at ~120s before surfacing a timeout. The engine
      // itself enforces ENGINE_TIMEOUT_MS (5 min default) so this is the UI's
      // safety net, not the source of truth.
      const POLL_DELAYS_MS = [
        1500, 1500, 2000, 2000, 3000, 3000, 3000, 4000, 4000, 4000, 4000, 4000,
        4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000, 4000,
        4000, 4000, 4000, 4000, 4000, 4000,
      ];

      for (let i = 0; i < POLL_DELAYS_MS.length; i++) {
        if (token.cancelled) return;
        await new Promise((r) => setTimeout(r, POLL_DELAYS_MS[i]));
        if (token.cancelled) return;

        let job: any;
        try {
          job = await getJobStatus(jobId);
        } catch {
          // Single transient network blip doesn't kill the loop; we'll retry
          // on the next tick. A persistent failure will eventually hit the
          // cap below.
          continue;
        }

        if (job.status === "COMPLETED") {
          if (token.cancelled) return;
          const out = await getOutputBySlug(job.result.slug);
          if (token.cancelled) return;
          setResult(out);
          setSelectedPost(0);
          qc.invalidateQueries({ queryKey: ["outputs", user.id] });
          toast.success("Impact story generated!");
          setGenerating(false);
          return;
        }

        if (job.status === "FAILED") {
          const code = job.error ?? "";
          if (code.includes("LIMIT_REACHED")) setError("limit");
          else if (code.includes("ENGINE_TIMEOUT")) setError("timeout");
          else if (code.includes("AI_PARSE_ERROR")) setError("ai");
          else setError(code || "generic");
          toast.error("Generation failed");
          setGenerating(false);
          return;
        }
      }

      // Exhausted the backoff schedule without seeing COMPLETED/FAILED.
      // Surface a graceful timeout — the job may still finish server-side and
      // appear in History; we just stopped polling.
      if (!token.cancelled) {
        setError("timeout");
        toast.error(
          "Still working… check the History tab in a minute for the result.",
        );
        setGenerating(false);
      }
    } catch (e: any) {
      if (token.cancelled) return;
      const msg = e?.message ?? "";
      if (msg.includes("LIMIT_REACHED")) setError("limit");
      else if (msg.includes("AI_PARSE_ERROR")) setError("ai");
      else if (msg.includes("RATE_LIMIT")) setError("rate_limit");
      else setError(msg || "generic");
      toast.error("Generation failed");
      setGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
    toast.success("Copied to clipboard");
  };

  const handleUpgrade = async () => {
    try {
      const res = (await createCheckoutSession()) as any;
      const options = {
        key: res.key,
        amount: res.amount,
        currency: res.currency,
        order_id: res.orderId,
        name: "DevBrand Pro",
        description: "Unlimited PR transformations",
        prefill: { name: user.name || user.githubLogin, email: user.email },
        handler: async (response: any) => {
          await verifyPayment({ data: response });
          qc.invalidateQueries({ queryKey: ["session"] });
          toast.success("Welcome to Pro!");
          window.location.reload();
        },
        theme: { color: "#3b82f6" },
      };
      new (window as any).Razorpay(options).open();
    } catch (e) {
      toast.error("Payment failed to initialize.");
    }
  };

  const handlePortal = async () => {
    if (!user) return;
    const res = (await createBillingPortal()) as any;
    toast.info(res.message);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSettingsSaving(true);
    try {
      await updateUserSettings({
        data: {
          userId: user.id,
          seniority: seniority as any,
          tone: tone as any,
        },
      });
      toast.success("Settings saved");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <AmbientBackdrop tab={tab} />
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 flex-col glass-morphism border-r border-white/5 sticky top-0 h-screen overflow-y-auto z-50">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-3 mb-12 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 grid place-items-center shadow-2xl shadow-blue-500/40 group-hover:scale-110 transition-transform duration-500">
              <span className="text-[14px] font-black text-white">DB</span>
            </div>
            <span className="font-black tracking-tighter text-xl gradient-text">
              DevBrand
            </span>
          </Link>

          <nav className="space-y-1 relative">
            {(
              [
                "generate",
                "history",
                "digest",
                "scheduled",
                "repos",
                "teams",
                "settings",
                "security",
              ] as Tab[]
            ).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "relative w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-200 z-10",
                    active
                      ? "text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {/* Shared layout pill: slides between tabs instead of
                      hard-swapping. The pill sits behind via z-0 so the
                      label/icon inherit the contrast on top. */}
                  {active && (
                    <motion.span
                      layoutId="dashboard-tab-pill"
                      transition={{
                        type: "spring",
                        bounce: 0.18,
                        duration: 0.55,
                      }}
                      className="absolute inset-0 -z-10 bg-foreground rounded-2xl shadow-2xl shadow-foreground/20"
                    />
                  )}
                  {t === "generate" && <Sparkles className="h-4 w-4" />}
                  {t === "history" && <GitPullRequest className="h-4 w-4" />}
                  {t === "digest" && <Calendar className="h-4 w-4" />}
                  {t === "scheduled" && <CalendarClock className="h-4 w-4" />}
                  {t === "repos" && <Github className="h-4 w-4" />}
                  {t === "teams" && <Users className="h-4 w-4" />}
                  {t === "settings" && <BarChart3 className="h-4 w-4" />}
                  {t === "security" && <Shield className="h-4 w-4" />}
                  {t}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-8 space-y-8">
          <div className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 relative overflow-hidden group/quota">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover/quota:opacity-100 transition-opacity" />
            <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-blue-400 mb-3 relative z-10">
              <span>Quota Usage</span>
              <span>
                {user?.plan === "free"
                  ? `${user.generationsThisMonth ?? 0}/3`
                  : "PRO"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-[2s] ease-out"
                style={{
                  width:
                    user?.plan === "pro"
                      ? "100%"
                      : `${((user.generationsThisMonth ?? 0) / 3) * 100}%`,
                }}
              />
            </div>
            {user?.plan === "free" && (
              <button
                onClick={handleUpgrade}
                className="w-full mt-5 py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-[0.15em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
              >
                Unlock Pro
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 px-2">
            <div className="relative">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  className="h-10 w-10 rounded-full border border-white/10"
                  alt=""
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10 grid place-items-center text-[12px] font-black">
                  {user?.githubLogin?.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 border-2 border-background rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-black truncate">
                {user?.githubLogin}
              </div>
              <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                {user?.plan}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 text-muted-foreground hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center">
              <span className="text-[10px] font-bold text-white">DB</span>
            </div>
          </Link>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            {(
              [
                "generate",
                "history",
                "digest",
                "scheduled",
                "repos",
                "teams",
                "settings",
                "security",
              ] as Tab[]
            ).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "relative text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md transition-colors duration-200",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="dashboard-mobile-tab-pill"
                      transition={{
                        type: "spring",
                        bounce: 0.2,
                        duration: 0.5,
                      }}
                      className="absolute inset-0 -z-10 bg-muted rounded-md"
                    />
                  )}
                  <span className="relative z-10">{t}</span>
                </button>
              );
            })}
          </div>
          <button onClick={handleLogout} className="p-2 text-muted-foreground">
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 p-6 lg:p-10 max-w-5xl">
          <Suspense
            fallback={
              <div className="h-[60vh] grid place-items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/20" />
              </div>
            }
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              >
                {tab === "generate" && (
                  <GenerateTab
                    user={user}
                    prUrl={prUrl}
                    setPrUrl={setPrUrl}
                    handleGenerate={handleGenerate}
                    generating={generating}
                    isFreeLimitReached={isFreeLimitReached}
                    handleUpgrade={handleUpgrade}
                    error={error}
                    result={result}
                    selectedPost={selectedPost}
                    setSelectedPost={setSelectedPost}
                    handleCopy={handleCopy}
                    copied={copied}
                    setTab={setTab}
                  />
                )}

                {tab === "history" && (
                  <HistoryTab
                    outputsLoading={outputsLoading}
                    outputs={outputs}
                    user={user}
                    setTab={setTab}
                    qc={qc}
                  />
                )}

                {tab === "digest" && <DigestTab />}

                {tab === "scheduled" && <ScheduledTab />}

                {tab === "repos" && <TrackedReposTab />}

                {tab === "teams" && (
                  <TeamsTab user={user} handleUpgrade={handleUpgrade} />
                )}

                {tab === "settings" && (
                  <SettingsTab
                    user={user}
                    seniority={seniority}
                    setSeniority={setSeniority}
                    tone={tone}
                    setTone={setTone}
                    handleSaveSettings={handleSaveSettings}
                    settingsSaving={settingsSaving}
                    handleUpgrade={handleUpgrade}
                    handlePortal={handlePortal}
                  />
                )}

                {tab === "security" && <SecurityTab />}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </main>
    </div>
  );
}

/**
 * Subtle dual-blob radial backdrop that shifts color + position based on
 * the active tab. Pinned behind everything (fixed inset, z-0, pointer-
 * events-none) so it never competes with content. Reads as ambient
 * lighting in the workspace — the room subtly redecorates as the user
 * switches surfaces. Each blob is large (60vw) and blurred so the edge
 * is imperceptible; the shift is felt more than seen.
 */
function AmbientBackdrop({ tab }: { tab: Tab }) {
  const palette: Record<
    Tab,
    { primary: string; accent: string; px: string; py: string }
  > = {
    generate: {
      primary: "rgba(59,130,246,0.10)",
      accent: "rgba(168,85,247,0.06)",
      px: "20%",
      py: "30%",
    },
    history: {
      primary: "rgba(168,85,247,0.09)",
      accent: "rgba(59,130,246,0.06)",
      px: "80%",
      py: "20%",
    },
    digest: {
      primary: "rgba(99,102,241,0.10)",
      accent: "rgba(236,72,153,0.05)",
      px: "60%",
      py: "75%",
    },
    scheduled: {
      primary: "rgba(34,211,238,0.09)",
      accent: "rgba(59,130,246,0.06)",
      px: "30%",
      py: "70%",
    },
    repos: {
      primary: "rgba(74,222,128,0.07)",
      accent: "rgba(34,211,238,0.05)",
      px: "70%",
      py: "30%",
    },
    teams: {
      primary: "rgba(251,146,60,0.07)",
      accent: "rgba(244,114,182,0.05)",
      px: "75%",
      py: "60%",
    },
    settings: {
      primary: "rgba(148,163,184,0.06)",
      accent: "rgba(100,116,139,0.05)",
      px: "50%",
      py: "50%",
    },
    security: {
      primary: "rgba(239,68,68,0.09)",
      accent: "rgba(244,114,182,0.05)",
      px: "85%",
      py: "85%",
    },
  };
  const p = palette[tab];
  return (
    <motion.div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      animate={{
        background: `radial-gradient(60vw 60vh at ${p.px} ${p.py}, ${p.primary}, transparent 70%), radial-gradient(40vw 50vh at ${100 - parseInt(p.px)}% ${100 - parseInt(p.py)}%, ${p.accent}, transparent 75%)`,
      }}
      transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}
