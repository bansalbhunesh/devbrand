import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Sparkles,
  GitPullRequest,
  Zap,
  TrendingUp,
  ExternalLink,
  ClipboardCopy,
  Check,
  LogOut,
  Loader2,
  ArrowUpRight,
  Users,
  Lock,
  BarChart3,
} from "lucide-react";
import { 
  getSession, 
  logout, 
  updateUserSettings, 
  transformPR, 
  getUserOutputs, 
  createCheckoutSession, 
  createBillingPortal,
  verifyPayment
} from "@/rpc.server";
import { cn } from "@/lib/utils";
import * as React from "react";
import { toast } from "sonner";
import { HistoryCard, Stat } from "@/components/dashboard/HistoryCard";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/" });
  },
  component: Dashboard,
});

type Tab = "generate" | "history" | "teams" | "settings";

import { Suspense, lazy } from "react";

const GenerateTab = lazy(() => import("@/components/dashboard/GenerateTab").then(m => ({ default: m.GenerateTab })));
const HistoryTab = lazy(() => import("@/components/dashboard/HistoryTab").then(m => ({ default: m.HistoryTab })));
const TeamsTab = lazy(() => import("@/components/dashboard/TeamsTab").then(m => ({ default: m.TeamsTab })));
const SettingsTab = lazy(() => import("@/components/dashboard/SettingsTab").then(m => ({ default: m.SettingsTab })));

function Dashboard() {
  const { session: user } = Route.useRouteContext() as { session: any };
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

  const isFreeLimitReached = user?.plan === "free" && (user?.generationsThisMonth ?? 0) >= 3;

  const handleGenerate = async () => {
    if (!prUrl.trim() || !user) return;
    setError(null);
    setResult(null);
    setGenerating(true);
    try {
      const out = await transformPR({ data: { prUrl: prUrl.trim(), userId: user.id } });
      setResult(out);
      setSelectedPost(0);
      qc.invalidateQueries({ queryKey: ["outputs", user.id] });
      toast.success("Impact story generated!");
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("LIMIT_REACHED")) setError("limit");
      else if (msg.includes("AI_PARSE_ERROR")) setError("ai");
      else setError("generic");
      toast.error("Generation failed");
    } finally {
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
      const res = await createCheckoutSession() as any;
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
    const res = await createBillingPortal() as any;
    toast.info(res.message);
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSettingsSaving(true);
    try {
      await updateUserSettings({ data: { userId: user.id, seniority: seniority as any, tone: tone as any } });
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
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-muted/10 sticky top-0 h-screen overflow-y-auto">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 mb-10">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center shadow-lg shadow-blue-500/20">
              <span className="text-[12px] font-bold text-white">DB</span>
            </div>
            <span className="font-bold tracking-tighter text-lg">DevBrand</span>
          </Link>

          <nav className="space-y-1">
            {(["generate", "history", "teams", "settings"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                  tab === t
                    ? "bg-foreground text-background shadow-lg shadow-foreground/10"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t === "generate" && <Sparkles className="h-4 w-4" />}
                {t === "history" && <GitPullRequest className="h-4 w-4" />}
                {t === "teams" && <Users className="h-4 w-4" />}
                {t === "settings" && <BarChart3 className="h-4 w-4" />}
                {t}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-6">
          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
            <div className="flex justify-between text-[9px] uppercase font-black tracking-widest text-blue-500/60 mb-2">
              <span>Monthly Quota</span>
              <span>{user?.plan === "free" ? `${user.generationsThisMonth ?? 0}/3` : "∞"}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000"
                style={{ width: user?.plan === "pro" ? "100%" : `${((user.generationsThisMonth ?? 0) / 3) * 100}%` }}
              />
            </div>
            {user?.plan === "free" && (
              <button 
                onClick={handleUpgrade}
                className="w-full mt-4 py-2 rounded-lg bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition shadow-lg shadow-blue-500/20"
              >
                Upgrade to Pro
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 px-2">
             {user?.avatarUrl ? (
               <img src={user.avatarUrl} className="h-8 w-8 rounded-full border border-border" alt="" />
             ) : (
               <div className="h-8 w-8 rounded-full bg-muted border border-border grid place-items-center text-[10px] font-bold">
                 {user?.githubLogin?.slice(0, 1).toUpperCase()}
               </div>
             )}
             <div className="flex-1 min-w-0">
               <div className="text-[11px] font-bold truncate">@{user?.githubLogin}</div>
               <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest">{user?.plan} plan</div>
             </div>
             <button onClick={handleLogout} className="p-2 text-muted-foreground hover:text-foreground transition">
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
             {(["generate", "history", "teams", "settings"] as Tab[]).map((t) => (
               <button
                 key={t}
                 onClick={() => setTab(t)}
                 className={cn(
                   "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md transition",
                   tab === t ? "bg-muted text-foreground" : "text-muted-foreground"
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
          <Suspense fallback={
            <div className="h-[60vh] grid place-items-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/20" />
            </div>
          }>
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
              <TeamsTab 
                user={user}
                handleUpgrade={handleUpgrade}
              />
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
          </Suspense>
        </div>
      </main>
    </div>
  );
}

