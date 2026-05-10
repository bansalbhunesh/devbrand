import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProfileData } from "@/rpc.server";
import { Github, Globe, Star, ShieldCheck, Zap, Activity, ExternalLink } from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/u/$login")({
  component: UserProfile,
});

function UserProfile() {
  const { login } = Route.useParams();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", login],
    queryFn: () => getProfileData({ data: login }),
  });

  if (isLoading) return <div className="min-h-screen grid place-items-center bg-background text-muted-foreground font-mono">Analyzing credentials...</div>;
  if (!profile) return <div className="min-h-screen grid place-items-center bg-background text-destructive font-mono">Engineer not found in DevBrand registry.</div>;

  const { user, publicOutputs } = profile;
  const stats = user.profile?.collabStats;
  const rhythm = user.profile?.contributionRhythm;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="border-b border-border bg-background/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} className="h-10 w-10 rounded-xl border border-border shadow-sm" alt={user.name ?? ""} />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 grid place-items-center text-xs font-bold text-blue-500">
                {user.name?.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="text-sm font-bold tracking-tight">{user.name}</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">@{user.githubLogin} · {user.seniority} Engineer</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href={`https://github.com/${user.githubLogin}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg border border-border hover:bg-muted transition text-muted-foreground hover:text-foreground">
              <Github className="h-4 w-4" />
            </a>
            <button className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-bold hover:opacity-90 transition shadow-lg shadow-foreground/5">Connect</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid md:grid-cols-[1.4fr_1fr] gap-12">
          {/* Main Feed */}
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">Verified Impact Feed</h2>
              <div className="flex gap-2">
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-widest">Live Signals</span>
              </div>
            </div>

            <div className="space-y-6">
              {publicOutputs.map((o) => (
                <a key={o.id} href={`/t/${o.slug}`} className="block group p-6 rounded-2xl border border-border bg-muted/20 hover:border-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/5 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{o.category}</div>
                    <div className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">IMPACT: {o.impactScore}/100</div>
                  </div>
                  <h3 className="text-lg font-bold mb-3 group-hover:text-blue-500 transition flex items-center gap-2">
                    {o.prTitle} <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-6">
                    {o.linkedinPost1}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground/60">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-blue-500" /> Verified Evidence</span>
                    <span className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> {o.complexityLevel} Complexity</span>
                  </div>
                </a>
              ))}

              {publicOutputs.length === 0 && (
                <div className="py-24 text-center border-2 border-dashed border-border rounded-3xl bg-muted/10">
                  <p className="text-muted-foreground italic font-mono text-sm">No impact stories have been cleared for public display.</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-8">
            <div className="p-8 rounded-3xl border border-border bg-gradient-to-br from-muted/30 to-background relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-8">Intelligence Summary</h3>
              <div className="space-y-8">
                <StatRow 
                  icon={<Zap className="text-yellow-500 h-4 w-4" />} 
                  label="Contr. Rhythm" 
                  value={rhythm?.label ?? "Steady"} 
                  sub={`Active ${rhythm?.mostActiveDay ?? 'Weekly'} · ${rhythm?.streakDays ?? 0}d Streak`} 
                />
                <StatRow 
                  icon={<ShieldCheck className="text-green-500 h-4 w-4" />} 
                  label="Architectural Depth" 
                  value="High" 
                  sub="Frequent load-bearing infrastructure changes" 
                />
                <StatRow 
                  icon={<Star className="text-blue-500 h-4 w-4" />} 
                  label="Force Multiplier" 
                  value={`${stats?.forceMultiplierScore ?? 0}/100`} 
                  sub={`Review Ratio: ${stats?.reviewsGiven ?? 0} given / ${stats?.reviewsReceived ?? 0} rec.`} 
                />
              </div>
            </div>

            <div className="p-8 rounded-3xl border border-border bg-muted/10 backdrop-blur-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Engineer Bio</h3>
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                "{profile.user.profile?.bio ?? 'Passionate engineer building the future, one PR at a time.'}"
              </p>
              {profile.user.profile?.customDomain && (
                <div className="mt-6 pt-6 border-t border-border flex items-center gap-2 text-xs text-blue-500 font-medium">
                  <Globe className="h-3 w-3" /> {profile.user.profile.customDomain}
                </div>
              )}
            </div>
            
            <div className="p-8 rounded-3xl border border-border bg-muted/10 backdrop-blur-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">GitHub README Badge</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-background border border-border flex flex-col items-center gap-4">
                  <img src={`/api/badge/${user.githubLogin}`} alt="DevBrand Reputation" />
                  <button 
                    onClick={() => {
                      const code = `[![DevBrand Reputation](https://devbrand.ai/api/badge/${user.githubLogin})](https://devbrand.ai/u/${user.githubLogin})`;
                      navigator.clipboard.writeText(code);
                      alert("Markdown copied!");
                    }}
                    className="text-[10px] font-bold text-blue-500 hover:underline"
                  >
                    Copy Markdown
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
                  Embed your verified reputation directly in your GitHub profile.
                </p>
              </div>
            </div>
            
            <div className="text-center p-6 border border-blue-500/10 rounded-2xl bg-blue-500/5">

              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-2">Registry Status</p>
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-blue-500">
                <ShieldCheck className="h-4 w-4" /> VERIFIED BY DEVBRAND
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatRow({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string, sub: string }) {
  return (
    <div className="flex items-start gap-4 group">
      <div className="p-2.5 rounded-xl bg-background border border-border group-hover:border-blue-500/30 transition-colors shadow-sm">{icon}</div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{label}</span>
          <span className="text-sm font-bold text-foreground">{value}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 font-medium">{sub}</p>
      </div>
    </div>
  );
}
