import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getProfileData } from "@/rpc";
import {
  Github,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  BarChart3,
  Link2,
  Check,
  Sparkles,
  UserX,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Reveal, RevealItem, REVEAL_EASE } from "@/components/site/Reveal";

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

  if (isLoading)
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-8">
          <div className="relative h-20 w-20 grid place-items-center">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-blue-500/40"
              animate={{
                scale: [1, 1.4, 1.8],
                opacity: [0.5, 0.2, 0],
              }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
            />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-blue-500/40"
              animate={{
                scale: [1, 1.4, 1.8],
                opacity: [0.5, 0.2, 0],
              }}
              transition={{
                duration: 2.8,
                delay: 1.4,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
            <div className="relative h-12 w-12 rounded-full bg-blue-500/10 border border-blue-500/30 grid place-items-center">
              <Activity className="h-5 w-5 text-blue-500/80" />
            </div>
          </div>
          <span className="text-[10px] font-black tracking-[0.4em] text-muted-foreground uppercase">
            Analyzing credentials...
          </span>
        </div>
      </div>
    );

  if (!profile)
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="max-w-md text-center">
          <div className="relative h-16 w-16 mx-auto mb-6 grid place-items-center">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-white/15"
              animate={{
                scale: [1, 1.35, 1.7],
                opacity: [0.4, 0.15, 0],
              }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
            />
            <div className="relative h-14 w-14 rounded-full bg-muted border border-border grid place-items-center">
              <UserX className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-black mb-3 tracking-tighter">
            Engineer not in registry.
          </h1>
          <p className="text-muted-foreground mb-8 font-medium leading-relaxed">
            We couldn't find a verified DevBrand profile for{" "}
            <span className="text-foreground font-bold">@{login}</span>. Their
            impact stories may be private, or they haven't connected GitHub yet.
          </p>
          <Link
            to="/"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-foreground text-background font-black text-sm transition-all duration-300 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)]"
          >
            Back to Registry
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
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
                <img
                  src={user.avatarUrl}
                  className="relative h-40 w-40 rounded-[2.5rem] border border-border shadow-2xl bg-muted"
                  alt=""
                />
              ) : (
                <div className="relative h-40 w-40 rounded-[2.5rem] border border-border shadow-2xl bg-muted grid place-items-center text-4xl font-black text-muted-foreground">
                  {user.githubLogin?.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-center md:text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-black tracking-widest uppercase border border-blue-500/20">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified{" "}
                {user.seniority} Engineer
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
              className="group px-8 py-4 rounded-2xl border border-border bg-background hover:bg-muted hover:border-border-strong transition-all duration-300 font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.4)] hover:-translate-y-0.5"
            >
              <Github className="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-8deg]" />{" "}
              Source
            </a>
            <button className="group px-10 py-4 rounded-2xl bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-12px_rgba(0,0,0,0.6)] flex items-center gap-3">
              Connect
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-20">
          {/* Main Feed */}
          <div className="space-y-16">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-muted-foreground">
                Evidence Feed
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent ml-8" />
            </div>

            <Reveal
              stagger={0.08}
              rootMargin="-10% 0px -10% 0px"
              className="grid gap-10"
            >
              {publicOutputs.map((o: any) => (
                <RevealItem key={o.id}>
                  <Link
                    to="/t/$slug"
                    params={{ slug: o.slug }}
                    className="group block p-10 rounded-[3rem] border border-border bg-muted/20 hover:border-blue-500/40 hover:bg-muted/40 hover:-translate-y-0.5 hover:shadow-[0_32px_80px_-32px_rgba(59,130,246,0.25)] transition-all duration-500 shadow-2xl shadow-black/5 relative overflow-hidden"
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
                            transition={{
                              duration: 0.9,
                              ease: REVEAL_EASE,
                            }}
                            viewport={{ once: true }}
                            className="h-full bg-blue-500"
                          />
                        </div>
                        <span className="text-[10px] font-black text-blue-500/60 uppercase">
                          {o.impactScore} IMPACT
                        </span>
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
                        {o.stack?.slice(0, 3).map((s: any) => (
                          <span
                            key={s}
                            className="px-2.5 py-1 rounded-lg bg-background border border-border text-[9px] font-mono font-black uppercase tracking-tighter text-muted-foreground"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                        Full Audit{" "}
                        <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
                      </div>
                    </div>
                  </Link>
                </RevealItem>
              ))}

              {publicOutputs.length === 0 && (
                <div className="py-32 text-center border-2 border-dashed border-border rounded-[3rem] bg-muted/10 relative overflow-hidden">
                  <div className="relative w-fit mx-auto mb-6">
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full border border-blue-500/25"
                      animate={{
                        scale: [1, 1.35, 1.7],
                        opacity: [0.4, 0.1, 0],
                      }}
                      transition={{
                        duration: 3.2,
                        repeat: Infinity,
                        ease: "easeOut",
                      }}
                    />
                    <Activity className="h-10 w-10 text-muted-foreground opacity-30 relative" />
                  </div>
                  <p className="text-muted-foreground italic font-medium text-sm max-w-sm mx-auto leading-relaxed">
                    No impact stories have been cleared for the public registry
                    yet.
                  </p>
                </div>
              )}
            </Reveal>
          </div>

          {/* Sidebar */}
          <div className="space-y-12">
            <div className="p-10 rounded-[3rem] border border-border bg-background/60 backdrop-blur-3xl shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                <Activity className="h-40 w-40" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-12">
                Intelligence Summary
              </h3>
              <div className="space-y-12">
                <StatRow
                  icon={<Zap className="text-yellow-500" />}
                  label="Momentum"
                  value={rhythm?.label || "Steady"}
                  sub={`${rhythm?.streakDays || 0}d Activity Streak`}
                />
                <StatRow
                  icon={<BarChart3 className="text-purple-500" />}
                  label="Collaboration"
                  value="Force Multiplier"
                  sub={`${stats?.reviewsGiven || 0} Verified Peer Reviews`}
                />
                <StatRow
                  icon={<ShieldCheck className="text-green-500" />}
                  label="Technical Depth"
                  value="High"
                  sub="Systems Optimization Focus"
                />
              </div>
            </div>

            <div className="p-10 rounded-[3rem] border border-border bg-muted/20 relative group">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-8">
                Registry Badge
              </h3>
              <div className="space-y-8">
                <div
                  className="relative group/badge cursor-pointer"
                  onClick={handleCopyBadge}
                >
                  <div className="absolute -inset-2 bg-blue-500/5 rounded-2xl blur opacity-0 group-hover/badge:opacity-100 transition-opacity" />
                  <img
                    src={`/api/badge/${user.githubLogin}`}
                    className="relative w-full shadow-2xl rounded-lg"
                    alt=""
                  />
                </div>
                <button
                  onClick={handleCopyBadge}
                  className="group w-full py-5 rounded-[1.5rem] bg-background border border-border text-[10px] font-black uppercase tracking-[0.3em] hover:bg-muted hover:border-border-strong hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.5)] transition-all duration-300 flex items-center justify-center gap-3"
                >
                  {copiedBadge ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Link2 className="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-8deg]" />
                  )}
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
            <span className="text-[10px] font-black uppercase tracking-widest">
              DevBrand Registry
            </span>
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" /> Verifiable Engineering Proof
            Layer
          </div>
        </footer>
      </div>
    </div>
  );
}

function StatRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-5 group/row">
      <div className="p-3.5 rounded-2xl bg-background border border-border group-hover/row:border-blue-500/30 transition-colors shadow-sm">
        {icon}
      </div>
      <div className="space-y-1">
        <div className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">
          {label}
        </div>
        <div className="text-lg font-black tracking-tight">{value}</div>
        <p className="text-[10px] text-muted-foreground/60 font-bold uppercase tracking-widest">
          {sub}
        </p>
      </div>
    </div>
  );
}
