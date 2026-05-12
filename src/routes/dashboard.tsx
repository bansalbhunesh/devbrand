import {
  createFileRoute,
  redirect,
  Link,
  useMatches,
} from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  GitPullRequest,
  Users,
  BarChart3,
  Loader2,
  LogOut,
  Shield,
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

type Tab = "generate" | "history" | "teams" | "settings" | "security";

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

  const handleGenerate = async () => {
    if (!prUrl.trim() || !user) return;
    setError(null);
    setResult(null);
    setGenerating(true);
    try {
      const { jobId } = (await transformPR({
        data: { prUrl: prUrl.trim(), userId: user.id },
      })) as any;

      // Start Polling
      const poll = async () => {
        try {
          const job = (await getJobStatus(jobId)) as any;
          if (job.status === "COMPLETED") {
            const out = await getOutputBySlug(job.result.slug);
            setResult(out);
            setSelectedPost(0);
            qc.invalidateQueries({ queryKey: ["outputs", user.id] });
            toast.success("Impact story generated!");
            setGenerating(false);
          } else if (job.status === "FAILED") {
            setError(job.error?.includes("LIMIT") ? "limit" : "generic");
            toast.error("Generation failed");
            setGenerating(false);
          } else {
            // Keep polling
            setTimeout(poll, 2000);
          }
        } catch (e) {
          setError("generic");
          setGenerating(false);
        }
      };

      setTimeout(poll, 2000);
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("LIMIT_REACHED")) setError("limit");
      else if (msg.includes("AI_PARSE_ERROR")) setError("ai");
      else setError("generic");
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
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
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

          <nav className="space-y-2">
            {(
              ["generate", "history", "teams", "settings", "security"] as Tab[]
            ).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                  tab === t
                    ? "bg-foreground text-background shadow-2xl shadow-foreground/20 scale-[1.02]"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                {t === "generate" && <Sparkles className="h-4 w-4" />}
                {t === "history" && <GitPullRequest className="h-4 w-4" />}
                {t === "teams" && <Users className="h-4 w-4" />}
                {t === "settings" && <BarChart3 className="h-4 w-4" />}
                {t === "security" && <Shield className="h-4 w-4" />}
                {t}
              </button>
            ))}
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
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
            {(
              ["generate", "history", "teams", "settings", "security"] as Tab[]
            ).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition",
                  tab === t
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
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
          </Suspense>
        </div>
      </main>
    </div>
  );
}
