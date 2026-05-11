import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProfileData } from "@/rpc.server";
import { Github, Globe, Star, ShieldCheck, Zap, Activity, ExternalLink, ArrowRight, BarChart3, Link2, Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/u/$login")({
  component: UserProfile,
});

function UserProfile() {
  const { login } = Route.useParams();
  const [copiedBadge, setCopiedBadge] = React.useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", login],
    queryFn: () => getProfileData({ data: login }),
  });

  if (isLoading) return (
    <div className="min-h-screen grid place-items-center bg-background text-muted-foreground font-mono uppercase tracking-[0.3em] text-[10px]">
      <div className="flex flex-col items-center gap-4">
        <Activity className="h-6 w-6 text-blue-500 animate-pulse" />
        Analyzing credentials...
      </div>
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen grid place-items-center bg-background text-destructive font-mono text-sm">
      Engineer not found in DevBrand registry.
    </div>
  );

  const { user, publicOutputs } = profile;
  const stats = user.profile?.collabStats;
  const rhythm = user.profile?.contributionRhythm;

  const handleCopyBadge = () => {
    const code = `[![DevBrand Reputation](https://devbrand.ai/api/badge/${user.githubLogin})](https://devbrand.ai/u/${user.githubLogin})`;
    navigator.clipboard.writeText(code);
    setCopiedBadge(true);
    setTimeout(() => setCopiedBadge(false), 2000);
    toast.success("Markdown copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground selection:bg-blue-500/30">
      {/* Premium Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] -translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl py-12 px-6 sm:py-20">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end justify-between gap-8 mb-20">
           <div className="flex flex-col md:flex-row items-center md:items-end gap-10">
              <div className="relative group">
                 <div className="absolute -inset-1.5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition-opacity" />
                 {user.avatarUrl ? (
                   <img src={user.avatarUrl} className="relative h-40 w-40 rounded-[2.5rem] border border-border shadow-2xl bg-muted" alt="" />
                 ) : (
                   <div className="relative h-40 w-40 rounded-[2.5rem] border border-border shadow-2xl bg-muted grid place-items-center text-4xl font-black text-muted-foreground">
                     {user.githubLogin?.slice(0, 1).toUpperCase()}
                   </div>
                 )}
              </div>
              <div className="text-center md:text-left space-y-4">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black tracking-widest uppercase border border-blue-500/20">
                   <ShieldCheck className="h-3.5 w-3.5" /> Verified {user.seniority} Engineer
                 </div>
                 <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">
                   {user.name || user.githubLogin}
                 </h1>
                 <p className="text-muted-foreground font-medium uppercase tracking-[0.4em] text-[11px] flex items-center justify-center md:justify-start gap-3">
                   <span className="opacity-40">Engineering Registry</span>
                   <span className="h-1 w-1 rounded-full bg-blue-500/30" />
                   <span className="text-foreground">@{user.githubLogin}</span>
                 </p>
              </div>
           </div>
           <div className="flex gap-4">
              <a 
                href={`https://github.com/${user.githubLogin}`} 
                target="_blank" 
                rel="noreferrer"
                className="px-8 py-4 rounded-2xl border border-border bg-background hover:bg-muted transition-all font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 shadow-xl shadow-black/5"
              >
                <Github className="h-4 w-4" /> Source
              </a>
              <button className="px-10 py-4 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] hover:opacity-90 transition-all shadow-2xl shadow-foreground/10 active:scale-95">
                Connect
              </button>
           </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-20">
           {/* Main Feed */}
           <div className="space-y-16">
              <div className="flex items-center justify-between">
                 <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground">Evidence Feed</h2>
                 <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent ml-8" />
              </div>
              
              <div className="grid gap-10">
                 {publicOutputs.map(o => (
                   <Link 
                     key={o.id} 
                     to="/t/$slug" 
                     params={{ slug: o.slug }} 
                     className="group block p-10 rounded-[3rem] border border-border bg-muted/20 hover:border-blue-500/40 hover:bg-muted/40 transition-all duration-500 shadow-2xl shadow-black/5 relative overflow-hidden"
                   >
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                        <Activity className="h-32 w-32" />
                      </div>

                      <div className="flex items-center justify-between mb-8">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 px-3 py-1 rounded-full bg-blue-500/5 border border-blue-500/10">
                           {o.category}
                         </span>
                         <div className="flex items-center gap-3">
                           <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                whileInView={{ width: `${o.impactScore}%` }}
                                className="h-full bg-blue-500"
                              />
                           </div>
                           <span className="text-[10px] font-black text-blue-500/60 uppercase">{o.impactScore} IMPACT</span>
                         </div>
                      </div>

                      <h3 className="text-2xl md:text-3xl font-black mb-6 group-hover:text-blue-500 transition-colors leading-tight tracking-tight">
                        {o.prTitle}
                      </h3>
                      
                      <p className="text-lg text-muted-foreground leading-relaxed italic line-clamp-3 mb-10 decoration-blue-500/10 underline-offset-8 decoration-2 underline">
                        "{o.linkedinPost1}"
                      </p>

                      <div className="flex items-center justify-between pt-8 border-t border-border/50">
                        <div className="flex flex-wrap gap-2">
                          {o.stack?.slice(0, 3).map(s => (
                            <span key={s} className="px-2.5 py-1 rounded-lg bg-background border border-border text-[9px] font-mono font-black uppercase tracking-tighter text-muted-foreground">
                              {s}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                          Full Audit <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
                        </div>
                      </div>
                   </Link>
                 ))}

                 {publicOutputs.length === 0 && (
                   <div className="py-32 text-center border-2 border-dashed border-border rounded-[3rem] bg-muted/10">
                     <p className="text-muted-foreground italic font-medium text-sm">No impact stories have been cleared for the public registry.</p>
                   </div>
                 )}
              </div>
           </div>

           {/* Sidebar */}
           <div className="space-y-12">
              <div className="p-10 rounded-[3rem] border border-border bg-background/60 backdrop-blur-3xl shadow-xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                   <Activity className="h-40 w-40" />
                 </div>
                 <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-12">Intelligence Summary</h3>
                 <div className="space-y-12">
                    <StatRow icon={<Zap className="text-yellow-500" />} label="Momentum" value={rhythm?.label || "Steady"} sub={`${rhythm?.streakDays || 0}d Activity Streak`} />
                    <StatRow icon={<BarChart3 className="text-purple-500" />} label="Collaboration" value="Force Multiplier" sub={`${stats?.reviewsGiven || 0} Verified Peer Reviews`} />
                    <StatRow icon={<ShieldCheck className="text-green-500" />} label="Technical Depth" value="High" sub="Systems Optimization Focus" />
                 </div>
              </div>

              <div className="p-10 rounded-[3rem] border border-border bg-muted/20 relative group">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-8">Registry Badge</h3>
                 <div className="space-y-8">
                    <div className="relative group/badge cursor-pointer" onClick={handleCopyBadge}>
                       <div className="absolute -inset-2 bg-blue-500/5 rounded-2xl blur opacity-0 group-hover/badge:opacity-100 transition-opacity" />
                       <img src={`/api/badge/${user.githubLogin}`} className="relative w-full shadow-2xl rounded-lg" alt="" />
                    </div>
                    <button 
                      onClick={handleCopyBadge} 
                      className="w-full py-5 rounded-[1.5rem] bg-background border border-border text-[10px] font-black uppercase tracking-[0.3em] hover:bg-muted transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      {copiedBadge ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
                      {copiedBadge ? "COPIED" : "COPY MARKDOWN"}
                    </button>
                    <p className="text-[10px] text-muted-foreground font-medium leading-relaxed text-center opacity-60">
                      Embed verified technical reputation directly in GitHub README.
                    </p>
                 </div>
              </div>

              {profile.user.profile?.bio && (
                <div className="p-10 rounded-[3rem] border border-border bg-muted/10 italic text-sm text-muted-foreground leading-relaxed">
                  "{profile.user.profile.bio}"
                </div>
              )}
           </div>
        </div>

        {/* Footer */}
        <footer className="mt-40 pt-12 border-t border-border flex items-center justify-between opacity-30">
           <div className="flex items-center gap-3">
             <div className="h-6 w-6 rounded-lg bg-foreground text-background grid place-items-center">
               <Sparkles className="h-3 w-3" />
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest">DevBrand Registry</span>
           </div>
           <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
             <ShieldCheck className="h-3.5 w-3.5" /> Verifiable Engineering Proof Layer
           </div>
        </footer>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value, sub }: { icon: React.ReactNode, label: string, value: string | number, sub: string }) {
  return (
    <div className="flex items-start gap-5 group/row">
      <div className="p-3.5 rounded-2xl bg-background border border-border group-hover/row:border-blue-500/30 transition-colors shadow-sm">{icon}</div>
      <div className="space-y-1">
        <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">{label}</div>
        <div className="text-lg font-black tracking-tight">{value}</div>
        <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">{sub}</p>
      </div>
    </div>
  );
}
