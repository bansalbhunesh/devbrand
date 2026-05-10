import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from "@tanstack/react-query";
import { getTeamImpact } from "@/rpc.server";
import { Users, TrendingUp, BarChart3, Download, Zap } from "lucide-react";
import * as React from "react";



export const Route = createFileRoute("/team/$id")({
  component: TeamDashboard,
});

function TeamDashboard() {
  const { id } = Route.useParams();
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: () => getTeamImpact({ data: id }),
  });

  if (isLoading) return <div className="min-h-screen grid place-items-center bg-background">Loading team metrics...</div>;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Users className="text-blue h-6 w-6" /> {teamData?.team.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Impact Analytics Dashboard</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs font-bold hover:bg-surface/50 transition">
            <Download className="h-4 w-4" /> Export Promo Data
          </button>
        </header>

        <div className="grid grid-cols-3 gap-6 mb-12">
          <StatCard label="Avg. Impact Score" value={teamData?.metrics.avgImpact.toString() || "0"} icon={<TrendingUp className="text-green-500" />} />
          <StatCard label="Core Infra Changes" value={teamData?.metrics.coreInfraCount.toString() || "0"} icon={<BarChart3 className="text-blue-500" />} />
          <StatCard label="Invisible Work Detected" value={`${teamData?.metrics.invisibleWorkPercent}%`} icon={<Zap className="text-yellow-500" />} />
        </div>

        <div className="rounded-2xl border border-border bg-surface/30 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Engineer</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primary Focus</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Impact Score</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent PR</th>
              </tr>
            </thead>
            <tbody>
              {teamData?.members.map((m) => (
                <tr key={m.id} className="border-b border-border hover:bg-surface/20 transition cursor-pointer">
                  <td className="px-6 py-4 flex items-center gap-3">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} className="h-8 w-8 rounded-lg border border-border" alt="" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-blue/10 border border-blue/20 grid place-items-center text-[10px] font-bold text-blue">
                        {m.name?.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm font-medium">{m.name}</span>
                  </td>

                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{m.seniority} engineer</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-border overflow-hidden">
                        <div className="h-full bg-blue rounded-full" style={{ width: `${m.avgImpact}%` }} />
                      </div>
                      <span className="text-xs font-bold">{m.avgImpact || "--"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">{m.prCount > 0 ? `${m.prCount} PRs` : "No activity"}</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="p-6 rounded-2xl border border-border bg-surface/40">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
