import { createFileRoute } from '@tanstack/react-router'
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "@/server/db";
import { teams, teamMembers, outputs } from "@/server/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { Users, TrendingUp, BarChart3, Download, Zap } from "lucide-react";

const getTeamImpact = createServerFn({ method: "GET" })
  .validator((teamId: string) => teamId)
  .handler(async ({ data: teamId }) => {
    // 1. Fetch team metadata
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) throw new Error("TEAM_NOT_FOUND");

    // 2. Fetch members
    const members = await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, teamId),
      with: { user: true },
    });

    const memberIds = members.map(m => m.userId);
    
    // 3. Fetch collective impacts
    const recentImpacts = memberIds.length > 0 
      ? await db.query.outputs.findMany({
          where: inArray(outputs.userId, memberIds),
          orderBy: [desc(outputs.createdAt)],
          limit: 30,
        })
      : [];

    // 4. Compute aggregate metrics
    const avgImpact = recentImpacts.length > 0
      ? recentImpacts.reduce((sum, o) => sum + o.impactScore, 0) / recentImpacts.length
      : 0;

    const coreInfraCount = recentImpacts.filter(o => o.category === "Architecture" || o.impactScore > 80).length;

    return { 
      team, 
      members: members.map(m => m.user), 
      recentImpacts,
      metrics: {
        avgImpact: Math.round(avgImpact),
        coreInfraCount,
        invisibleWorkPercent: 42, // placeholder for now
      }
    };
  });


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
                    <img src={m.avatarUrl ?? ""} className="h-8 w-8 rounded-lg border border-border" alt="" />
                    <span className="text-sm font-medium">{m.name}</span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-muted-foreground">{m.seniority} engineer</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-border overflow-hidden">
                        <div className="h-full bg-blue rounded-full" style={{ width: '70%' }} />
                      </div>
                      <span className="text-xs font-bold">--</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">Last week</td>
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
