import { Octokit } from "octokit";
import { db } from "./db";
import { users, profiles } from "./schema";
import { eq } from "drizzle-orm";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

interface ContributionRhythm {
  mostActiveDay: string;
  streakDays: number;
  avgPRsPerMonth: number;
  label: "Elite" | "Consistent" | "Burst" | "Infrequent";
  lastComputedAt: string;
}

export async function computeCollabGraph(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || !user.githubLogin) return;

  try {
    const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
      username: user.githubLogin,
      per_page: 100,
    });

    const pushEvents = events.filter((e) => e.type === "PushEvent");
    
    // 1. Activity Distribution
    const dayCounts = new Array(7).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    
    pushEvents.forEach((e) => {
      const d = new Date(e.created_at!);
      dayCounts[d.getDay()]++;
      hourlyCounts[d.getHours()]++;
    });

    const mostActiveDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
    const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    // 2. Compute Rhythm
    // Simple streak detection (past 90 days)
    const dates = [...new Set(pushEvents.map((e) => new Date(e.created_at!).toDateString()))];
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const check = new Date(today);
      check.setDate(check.getDate() - i);
      if (dates.includes(check.toDateString())) {
        streak++;
      } else if (i > 0) {
        break; // break if gap
      }
    }

    const avgPRsPerMonth = Math.round((events.filter((e) => e.type === "PullRequestEvent").length / 3) * 10) / 10;

    const label: ContributionRhythm["label"] =
      streak >= 20 ? "Elite" : streak >= 12 ? "Consistent" : avgPRsPerMonth >= 8 ? "Burst" : "Infrequent";

    const rhythm: ContributionRhythm = {
      mostActiveDay: DAYS[mostActiveDayIdx] ?? "Tuesday",
      streakDays: streak,
      avgPRsPerMonth,
      label,
      lastComputedAt: new Date().toISOString(),
    };

    await db
      .insert(profiles)
      .values({ userId, contributionRhythm: rhythm as any })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { contributionRhythm: rhythm as any, updatedAt: new Date() },
      });

    return { rhythm };
  } catch (error) {
    console.error("[Collab Graph] Computation failed", error);
    return {
      mostActiveDay: "Unknown",
      streakDays: 0,
      avgPRsPerMonth: 0,
      label: "Infrequent" as any,
      lastComputedAt: new Date().toISOString(),
    };
  }
}
