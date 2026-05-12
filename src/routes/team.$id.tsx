import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTeamImpact } from "@/rpc";
import {
  Users,
  TrendingUp,
  BarChart3,
  Download,
  Zap,
  ArrowRight,
  Search,
} from "lucide-react";
import * as React from "react";
import { motion } from "framer-motion";
import { Reveal, RevealItem, REVEAL_EASE } from "@/components/site/Reveal";

export const Route = createFileRoute("/team/$id")({
  component: TeamDashboard,
});

function TeamDashboard() {
  const { id } = Route.useParams();
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: () => getTeamImpact({ data: id }),
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
              <Users className="h-5 w-5 text-blue-500/80" />
            </div>
          </div>
          <span className="text-[10px] font-black tracking-[0.4em] text-muted-foreground uppercase">
            Computing team velocity...
          </span>
        </div>
      </div>
    );

  if (!teamData)
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
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-black mb-3 tracking-tighter">
            Team not in registry.
          </h1>
          <p className="text-muted-foreground mb-8 font-medium leading-relaxed">
            This team either doesn't exist or hasn't published its analytics
            yet.
          </p>
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-foreground text-background font-black text-sm transition-all duration-300 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5)]"
          >
            Back to Dashboard
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Ambient background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] -translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-6xl py-12 px-6 sm:py-16">
        <Reveal stagger={0.08} rootMargin="0px">
          <RevealItem className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
                <Users className="text-blue-500 h-7 w-7" />{" "}
                {teamData?.team.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-2 uppercase tracking-[0.3em] text-[10px] font-black">
                Impact Analytics Dashboard
              </p>
            </div>
            <button className="group flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-xs font-black uppercase tracking-widest hover:border-border-strong hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.5)] transition-all duration-300">
              <Download className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />{" "}
              Export Promo Data
            </button>
          </RevealItem>

          <RevealItem>
            <Reveal
              stagger={0.07}
              rootMargin="0px"
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12"
            >
              <RevealItem>
                <StatCard
                  label="Avg. Impact Score"
                  value={teamData?.metrics.avgImpact.toString() || "0"}
                  icon={<TrendingUp className="h-5 w-5 text-green-500" />}
                />
              </RevealItem>
              <RevealItem>
                <StatCard
                  label="Core Infra Changes"
                  value={teamData?.metrics.coreInfraCount.toString() || "0"}
                  icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
                />
              </RevealItem>
              <RevealItem>
                <StatCard
                  label="Invisible Work Detected"
                  value={`${teamData?.metrics.invisibleWorkPercent}%`}
                  icon={<Zap className="h-5 w-5 text-yellow-500" />}
                />
              </RevealItem>
            </Reveal>
          </RevealItem>

          <RevealItem className="rounded-2xl border border-border bg-muted/20 overflow-hidden shadow-2xl shadow-black/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Engineer
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Primary Focus
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Impact Score
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Recent PR
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamData?.members.map((m, i) => (
                  <tr
                    key={m.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {m.avatarUrl ? (
                          <img
                            src={m.avatarUrl}
                            className="h-9 w-9 rounded-lg border border-border group-hover:border-blue-500/40 transition-colors"
                            alt=""
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 grid place-items-center text-[10px] font-black text-blue-500">
                            {m.name?.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm font-bold group-hover:text-blue-500 transition-colors">
                          {m.name}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-mono text-muted-foreground capitalize">
                      {m.seniority} engineer
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-28 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${m.avgImpact || 0}%` }}
                            transition={{
                              duration: 0.9,
                              delay: 0.2 + i * 0.04,
                              ease: REVEAL_EASE,
                            }}
                            className="h-full bg-blue-500 rounded-full"
                          />
                        </div>
                        <span className="text-xs font-black tracking-tighter">
                          {m.avgImpact || "--"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {m.prCount > 0 ? `${m.prCount} PRs` : "No activity"}
                    </td>
                  </tr>
                ))}
                {teamData.members.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-16 text-center text-sm text-muted-foreground italic font-medium"
                    >
                      No team members have public activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </RevealItem>
        </Reveal>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group p-6 rounded-2xl border border-border bg-muted/30 hover:border-border-strong hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(59,130,246,0.25)] transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <div className="p-2 rounded-xl bg-background border border-border group-hover:border-blue-500/20 transition-colors">
          {icon}
        </div>
      </div>
      <div className="text-4xl font-black tracking-tighter">{value}</div>
    </div>
  );
}
