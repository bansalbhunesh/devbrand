import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Github, Sparkles, ClipboardCopy, Check, Loader2,
  GitPullRequest, Lock, Zap, ArrowUpRight, Settings,
  ExternalLink, BarChart3, Eye, EyeOff, LogOut, Star,
} from "lucide-react";
import { getSession, logout, updateUserSettings } from "@/server/auth";
import { transformPR, getUserOutputs, toggleOutputVisibility } from "@/server/transform";
import { createCheckoutSession, createBillingPortal } from "@/server/billing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) throw redirect({ to: "/" });
    return { session };
  },
  loader: async ({ context }) => ({
    user: (context as { session: Awaited<ReturnType<typeof getSession>> }).session,
  }),
  component: Dashboard,
});

type Tab = "generate" | "history" | "settings";

function Dashboard() {
  const { user } = Route.useLoaderData() as { user: NonNullable<Awaited<ReturnType<typeof getSession>>> };
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
    queryFn: () => getUserOutputs({ data: user!.id }),
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
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("LIMIT_REACHED")) setError("limit");
      else if (msg.includes("AI_PARSE_ERROR")) setError("ai");
      else setError("generic");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };

  const handleUpgrade = async () => {
    if (!user) return;
    const { url } = await createCheckoutSession({ data: { userId: user.id } });
    window.location.href = url;
  };

  const handlePortal = async () => {
    if (!user) return;
    const { url } = await createBillingPortal({ data: { userId: user.id } });
    window.location.href = url;
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setSettingsSaving(true);
    await updateUserSettings({ data: { userId: user.id, seniority: seniority as any, tone: tone as any } });
    setSettingsSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const postLabels = ["Problem / Outcome", "Tradeoff / Decision", "Learnings"];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center">
              <span className="text-[12px] font-bold text-white">DB</span>
            </div>
            <span className="font-semibold tracking-tight">DevBrand</span>
            {user?.plan === "pro" && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 border border-blue-500/25">
                PRO
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">
                {user?.plan === "free"
                  ? `${user.generationsThisMonth ?? 0}/3 used`
                  : "unlimited"}
              </span>
            </div>
            <img
              src={user?.avatarUrl ?? ""}
              className="h-7 w-7 rounded-full border border-border"
              alt={user?.name ?? ""}
            />
            <button
              onClick={handleLogout}
              className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-1 border-b border-border mb-8">
          {(["generate", "history", "settings"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium capitalize transition border-b-2 -mb-px",
                tab === t
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "generate" ? "Generate" : t === "history" ? "History" : "Settings"}
            </button>
          ))}
        </div>

        {tab === "generate" && (
          <div className="grid lg:grid-cols-[1fr_1.3fr] gap-10">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight mb-1">
                  Transform a PR
                </h2>
                <p className="text-sm text-muted-foreground">
                  Paste any GitHub pull request URL to generate LinkedIn posts, resume bullets, and interview hooks.
                </p>
              </div>

              {isFreeLimitReached && (
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">You've used all 3 free generations this month.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upgrade to Pro for unlimited generations + LinkedIn auto-drafting.
                      </p>
                      <button
                        onClick={handleUpgrade}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:opacity-90 transition"
                      >
                        <Zap className="h-3.5 w-3.5" /> Upgrade to Pro — $12/mo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  PR URL
                </label>
                <div className="relative">
                  <GitPullRequest className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="url"
                    value={prUrl}
                    onChange={(e) => setPrUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    placeholder="https://github.com/org/repo/pull/123"
                    disabled={isFreeLimitReached}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted border border-border focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition outline-none text-sm disabled:opacity-40 font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating || !prUrl.trim() || isFreeLimitReached}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 disabled:opacity-40 transition"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing diff...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Generate impact story</>
                )}
              </button>

              {error === "limit" && (
                <p className="text-xs text-destructive">Monthly limit reached. Upgrade to Pro for more.</p>
              )}
              {error === "ai" && (
                <p className="text-xs text-destructive">AI returned an unexpected format. Please try again.</p>
              )}
              {error === "generic" && (
                <p className="text-xs text-destructive">Something went wrong. Check that the PR URL is public.</p>
              )}

              <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
                <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Your calibration</div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Level: </span>
                    <span className="capitalize font-medium">{user?.seniority}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tone: </span>
                    <span className="capitalize font-medium">{user?.tone}</span>
                  </div>
                </div>
                <button
                  onClick={() => setTab("settings")}
                  className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                >
                  Adjust in settings <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {!result && !generating && (
                <div className="h-96 rounded-2xl border-2 border-dashed border-border grid place-items-center text-center">
                  <div>
                    <BarChart3 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Your impact story appears here</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Paste a PR URL and click generate</p>
                  </div>
                </div>
              )}

              {generating && (
                <div className="h-96 rounded-2xl border border-border bg-muted/20 grid place-items-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Reading the diff...</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Scoring architecture · Building context · Writing story</p>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                    <div className="flex gap-6 text-sm">
                      <Stat label="Impact" value={`${result.impactScore}/100`} />
                      <Stat label="Category" value={result.category} />
                      <Stat label="Level" value={result.complexityLevel} />
                    </div>
                    <a
                      href={`/t/${result.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 flex items-center gap-1 hover:underline"
                    >
                      Share <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="flex gap-2">
                    {postLabels.map((label, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedPost(i)}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-xs font-medium transition border",
                          selectedPost === i
                            ? "bg-foreground text-background border-foreground"
                            : "bg-transparent text-muted-foreground border-border hover:border-border-strong"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-5 relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">LinkedIn post</span>
                      <button
                        onClick={() => handleCopy(
                          [result.linkedinPost1, result.linkedinPost2, result.linkedinPost3][selectedPost],
                          `post-${selectedPost}`
                        )}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
                      >
                        {copied === `post-${selectedPost}` ? (
                          <><Check className="h-3 w-3 text-green-500" /> Copied</>
                        ) : (
                          <><ClipboardCopy className="h-3 w-3" /> Copy</>
                        )}
                      </button>
                    </div>
                    <p className="text-sm leading-7 text-pretty whitespace-pre-line">
                      {[result.linkedinPost1, result.linkedinPost2, result.linkedinPost3][selectedPost]}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Resume bullet</span>
                      <button
                        onClick={() => handleCopy(result.resumeBullet, "resume")}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
                      >
                        {copied === "resume" ? <><Check className="h-3 w-3 text-green-500" /> Copied</> : <><ClipboardCopy className="h-3 w-3" /> Copy</>}
                      </button>
                    </div>
                    <p className="text-sm font-mono leading-6">{result.resumeBullet}</p>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/20 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Interview hook</span>
                      <button
                        onClick={() => handleCopy(result.interviewHook, "hook")}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border"
                      >
                        {copied === "hook" ? <><Check className="h-3 w-3 text-green-500" /> Copied</> : <><ClipboardCopy className="h-3 w-3" /> Copy</>}
                      </button>
                    </div>
                    <p className="text-sm leading-6 italic text-muted-foreground">{result.interviewHook}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight">Generation history</h2>
            {outputsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-12">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
              </div>
            ) : outputs && outputs.length > 0 ? (
              <div className="space-y-4">
                {outputs.map((o) => (
                  <HistoryCard key={o.id} output={o} userId={user.id} onQueryInvalidate={() => qc.invalidateQueries({ queryKey: ["outputs", user.id] })} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-border rounded-3xl">
                <p className="text-muted-foreground">No generations yet.</p>
                <button onClick={() => setTab("generate")} className="mt-4 text-sm text-blue-500 hover:underline">
                  Generate your first impact story →
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="max-w-lg space-y-10">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight mb-6">Settings</h2>
              <div className="space-y-8">
                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3 block">Seniority level</label>
                  <div className="grid grid-cols-4 gap-2">
                    {["junior", "mid", "senior", "staff"].map((s) => (
                      <button key={s} onClick={() => setSeniority(s as any)} className={cn("py-2.5 rounded-lg text-sm font-medium capitalize transition border", seniority === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-border-strong")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3 block">Writing tone</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["direct", "storytelling", "technical"].map((t) => (
                      <button key={t} onClick={() => setTone(t as any)} className={cn("py-2.5 rounded-lg text-sm font-medium capitalize transition border", tone === t ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-border-strong")}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleSaveSettings} disabled={settingsSaving} className="px-6 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2">
                  {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save settings
                </button>
              </div>
            </div>

            <div className="border-t border-border pt-10">
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">Subscription Plan</div>
              <div className="flex items-center justify-between p-5 rounded-xl border border-border bg-muted/20">
                <div>
                  <p className="font-medium capitalize">{user.plan} plan</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {user.plan === "free" ? `${user.generationsThisMonth ?? 0}/3 generations used` : "Unlimited access"}
                  </p>
                </div>
                {user.plan === "free" ? (
                  <button onClick={handleUpgrade} className="px-4 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Upgrade $12/mo
                  </button>
                ) : (
                  <button onClick={handlePortal} className="px-4 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted/40 transition">
                    Manage billing
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function HistoryCard({ output, userId, onQueryInvalidate }: { output: any; userId: string; onQueryInvalidate: () => void }) {
  const [copied, setCopied] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(output.linkedinPost1);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleTogglePublic = async () => {
    setToggling(true);
    await toggleOutputVisibility({ data: { outputId: output.id, userId, isPublic: !output.isPublic } });
    onQueryInvalidate();
    setToggling(false);
  };

  return (
    <div className="group rounded-2xl border border-border bg-muted/20 hover:border-border-strong transition p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-blue-500 font-medium">{output.category}</span>
          <span className="text-[10px] font-mono text-muted-foreground">Score: {output.impactScore}/100</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleTogglePublic} disabled={toggling} className="text-[11px] flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border">
            {output.isPublic ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {output.isPublic ? "Public" : "Private"}
          </button>
          <a href={`/t/${output.slug}`} target="_blank" rel="noopener noreferrer" className="text-[11px] flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md border border-transparent hover:border-border">
            <ExternalLink className="h-3.5 w-3.5" /> Share
          </a>
        </div>
      </div>
      <h3 className="text-base font-semibold mb-2 group-hover:text-blue-500 transition">{output.prTitle}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">{output.linkedinPost1}</p>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-muted-foreground">
          {new Date(output.createdAt).toLocaleDateString()}
        </span>
        <button onClick={handleCopy} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition">
          {copied ? <><Check className="h-3.5 w-3.5 text-green-500" /> Copied</> : <><ClipboardCopy className="h-3.5 w-3.5" /> Copy post</>}
        </button>
      </div>
    </div>
  );
}
