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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center">
                <span className="text-[12px] font-bold text-white">DB</span>
              </div>
              <span className="font-semibold tracking-tight">DevBrand</span>
            </Link>
            {user?.plan === "pro" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/25">
                PRO
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 border border-green-500/20">
                  <TrendingUp className="h-3 w-3" />
                  <span className="font-bold tracking-tight">84% Velocity</span>
                  <svg width="40" height="12" className="ml-1 opacity-60">
                    <path
                      d="M 0 10 L 5 8 L 10 9 L 15 5 L 20 7 L 25 3 L 30 5 L 35 1 L 40 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
              
              <div className="w-32 space-y-1.5">
                <div className="flex justify-between text-[9px] uppercase font-bold tracking-widest opacity-60">
                  <span>Quota</span>
                  <span>{user?.plan === "free" ? `${user.generationsThisMonth ?? 0}/3` : "∞"}</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/50">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000",
                      user?.plan === "pro" ? "bg-blue-500" : "bg-foreground"
                    )}
                    style={{ 
                      width: user?.plan === "pro" 
                        ? "100%" 
                        : `${((user.generationsThisMonth ?? 0) / 3) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            {user?.plan === "pro" && (
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center gap-1.5 px-3 py-1 rounded-full bg-background border border-blue-500/20 text-[10px] font-black tracking-[0.1em] text-blue-500 shadow-xl shadow-blue-500/5">
                  <Sparkles className="h-2.5 w-2.5 fill-blue-500" />
                  PRO
                </div>
              </div>
            )}

            <Link 
              to="/referrals" 
              className="text-[10px] text-muted-foreground hover:text-foreground transition flex items-center gap-1.5 font-black uppercase tracking-widest"
            >
              <Users className="h-3.5 w-3.5" /> Referrals
            </Link>

            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                className="h-7 w-7 rounded-full border border-border shadow-sm"
                alt={user.name ?? ""}
              />
            ) : (
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 grid place-items-center text-[10px] font-bold text-blue-500">
                {user?.name?.slice(0, 1).toUpperCase() || "U"}
              </div>
            )}

            <button
              onClick={handleLogout}
              className="text-[10px] text-muted-foreground hover:text-foreground transition flex items-center gap-1.5 font-black uppercase tracking-widest"
            >
              <LogOut className="h-3.5 w-3.5" /> Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-1 border-b border-border mb-8 overflow-x-auto no-scrollbar">
          {(["generate", "history", "teams", "settings"] as Tab[]).map((t) => (

            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] transition border-b-2 -mb-px whitespace-nowrap",
                tab === t
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <Suspense fallback={
          <div className="h-96 grid place-items-center">
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
    </div>
  );
}

