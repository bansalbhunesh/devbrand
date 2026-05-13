import { db } from "@infrastructure/database/db.server";
import { teams, teamMembers, outputs } from "@infrastructure/database/schema.server";
import { eq, inArray, desc } from "drizzle-orm";

export class GetTeamImpactUseCase {
  async execute(teamId: string) {
    const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
    if (!team) throw new Error("TEAM_NOT_FOUND");
    
    const members = await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, teamId),
      with: { user: true },
    });
    
    const memberIds = members.map((m: any) => m.userId);
    const recentImpacts = memberIds.length > 0
      ? await db.query.outputs.findMany({
          where: inArray(outputs.userId, memberIds),
          orderBy: [desc(outputs.createdAt)],
          limit: 30,
        })
      : [];

    const avgImpact = recentImpacts.length > 0
      ? recentImpacts.reduce((sum: number, o: any) => sum + (o.impactScore || 0), 0) / recentImpacts.length
      : 0;

    const coreInfraCount = recentImpacts.filter((o: any) => o.category === "Architecture" || (o.impactScore || 0) > 80).length;
    const invisibleWorkCount = recentImpacts.filter((o: any) => o.metadata?.invisibleWorkReport?.isSignificant).length;
    const invisibleWorkPercent = recentImpacts.length > 0 ? Math.round((invisibleWorkCount / recentImpacts.length) * 100) : 0;

    const membersWithStats = members.map((m: any) => {
      const userImpacts = recentImpacts.filter((o: any) => o.userId === m.userId);
      const memberAvgImpact = userImpacts.length > 0
        ? Math.round(userImpacts.reduce((sum: number, o: any) => sum + (o.impactScore || 0), 0) / userImpacts.length)
        : 0;
      return {
        ...((m.user as any) || {}),
        id: m.userId,
        avgImpact: memberAvgImpact,
        prCount: userImpacts.length,
      };
    });

    return {
      team,
      members: membersWithStats,
      recentImpacts,
      metrics: {
        avgImpact: Math.round(avgImpact),
        coreInfraCount,
        invisibleWorkPercent,
      },
    };
  }
}
