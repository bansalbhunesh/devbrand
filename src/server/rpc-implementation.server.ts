import { db } from "@/server/db.server";
import { users, outputs, teams, teamMembers, roasts } from "@/server/schema.server";
import { eq, avg, and, desc, inArray, count, sql } from "drizzle-orm";

/**
 * ELITE ARCHITECTURE: This file is strictly server-only.
 * It contains the actual implementation logic for all RPCs.
 */

export async function getBadgeDataImpl(login: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.githubLogin, login),
  });
  if (!user) return null;
  const result = await db.select({ avgScore: avg(outputs.impactScore) }).from(outputs).where(eq(outputs.userId, user.id));
  const score = Math.round(Number(result[0]?.avgScore || 0));
  return { score, login: user.githubLogin };
}

export async function getProfileDataImpl(login: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.githubLogin, login),
    with: { profile: true },
  });
  if (!user) return null;
  const publicOutputs = await db.query.outputs.findMany({
    where: and(eq(outputs.userId, user.id), eq(outputs.isPublic, true)),
    orderBy: [desc(outputs.createdAt)],
    limit: 10,
  });
  return { user, publicOutputs };
}

export async function getTeamImpactImpl(teamId: string) {
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) throw new Error("TEAM_NOT_FOUND");
  const members = await db.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, teamId),
    with: { user: true },
  });
  const memberIds = members.map((m) => m.userId);
  const recentImpacts = memberIds.length > 0 ? await db.query.outputs.findMany({
    where: inArray(outputs.userId, memberIds),
    orderBy: [desc(outputs.createdAt)],
    limit: 30,
  }) : [];
  
  const avgImpact = recentImpacts.length > 0 ? recentImpacts.reduce((sum, o) => sum + o.impactScore, 0) / recentImpacts.length : 0;
  const coreInfraCount = recentImpacts.filter(o => o.category === 'Architecture' || o.impactScore > 80).length;
  const invisibleWorkCount = recentImpacts.filter(o => o.metadata?.invisibleWorkReport?.isSignificant).length;
  const invisibleWorkPercent = recentImpacts.length > 0 ? Math.round((invisibleWorkCount / recentImpacts.length) * 100) : 0;

  const membersWithStats = members.map((m) => {
    const userImpacts = recentImpacts.filter((o) => o.userId === m.userId);
    const memberAvgImpact = userImpacts.length > 0 ? Math.round(userImpacts.reduce((sum, o) => sum + o.impactScore, 0) / userImpacts.length) : 0;
    return { ...((m.user as any) || {}), id: m.userId, avgImpact: memberAvgImpact, prCount: userImpacts.length };
  });

  return { team, members: membersWithStats, recentImpacts, metrics: { avgImpact: Math.round(avgImpact), coreInfraCount, invisibleWorkPercent } };
}

export async function getPublicFeedImpl() {
  const [feed, topRoasts, topEngineers] = await Promise.all([
    db.query.outputs.findMany({ where: eq(outputs.isPublic, true), orderBy: [desc(outputs.createdAt)], limit: 30, with: { user: true } }),
    db.query.roasts.findMany({ where: eq(roasts.isPublic, true), orderBy: [desc(roasts.createdAt)], limit: 30 }),
    db.query.users.findMany({ limit: 5, with: { outputs: true } }),
  ]);
  const rankedEngineers = topEngineers.map(u => ({
    ...u,
    totalImpact: u.outputs.reduce((s, o) => s + o.impactScore, 0),
    avgImpact: Math.round(u.outputs.reduce((s, o) => s + o.impactScore, 0) / (u.outputs.length || 1))
  })).sort((a, b) => b.totalImpact - a.totalImpact);
  return { feed, topRoasts, topEngineers: rankedEngineers };
}

export async function getReferralDataImpl(userId: string) {
  const [user] = await db.query.users.findMany({ where: eq(users.id, userId) });
  if (!user) throw new Error("User not found");
  const [referredCountRes] = await db.select({ count: count() }).from(users).where(eq(users.referredBy, userId));
  return { referralCode: user.referralCode, referredCount: referredCountRes.count, generationsBonus: referredCountRes.count * 5 };
}
