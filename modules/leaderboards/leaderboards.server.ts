import { db } from "@infrastructure/database/db.server";
import { users, outputs } from "@infrastructure/database/schema.server";
import { sql, desc, gte, eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/start";

export interface LeaderboardEntry {
  rank: number;
  username: string;
  egoScore: number;
  reposAnalyzed: number;
  verdictCategory: string;
  badges: string[];
}

export async function getGlobalLeaderboard(
  timeframe: "week" | "month" | "allTime" = "month"
): Promise<LeaderboardEntry[]> {
  const cutoff = timeframe === "week"
    ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : timeframe === "month"
    ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    : new Date(0);
  
  const leaders = await db
    .select({
      userId: users.id,
      username: users.githubLogin,
      egoScore: sql<number>`COALESCE(SUM(${outputs.impactScore}), 0)`,
      reposAnalyzed: sql<number>`COUNT(DISTINCT ${outputs.id})`,
    })
    .from(users)
    .leftJoin(outputs, eq(outputs.userId, users.id))
    .where(gte(outputs.createdAt, cutoff))
    .groupBy(users.id)
    .orderBy(desc(sql<number>`COALESCE(SUM(${outputs.impactScore}), 0)`))
    .limit(100);
  
  return leaders.map((entry, idx) => ({
    rank: idx + 1,
    username: entry.username,
    egoScore: entry.egoScore,
    reposAnalyzed: entry.reposAnalyzed,
    verdictCategory: entry.egoScore > 500 ? "Elite" : "Standard",
    badges: [],
  }));
}

export const getLeaderboard = createServerFn({ method: "GET" })
  .validator((params: any) => params)
  .handler(async ({ data }) => {
    return await getGlobalLeaderboard(data?.timeframe || "month");
  });
