import { Octokit } from "octokit";
import { db } from "./db";
import { profiles } from "./schema";
import { eq } from "drizzle-orm";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

export interface CollabProfile {
  reviewsGiven: number;
  reviewsReceived: number;
  forceMultiplierScore: number;
  topCollaborators: string[];
  lastComputedAt: string;
}

export interface ContributionRhythm {
  mostActiveDay: string;
  streakDays: number;
  avgPRsPerMonth: number;
  label: "Elite" | "Consistent" | "Burst" | "Infrequent";
  lastComputedAt: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function buildCollabGraph(
  userId: string,
  username: string
): Promise<CollabProfile> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  if (
    profile?.collabStats &&
    Date.now() - new Date(profile.collabStats.lastComputedAt).getTime() < CACHE_TTL_MS
  ) {
    return profile.collabStats;
  }

  try {
    const [reviewsGivenRes, reviewsReceivedRes, eventsRes] = await Promise.all([
      octokit.rest.search.issuesAndPullRequests({
        q: `type:pr reviewed-by:${username} -author:${username}`,
        per_page: 100,
      }),
      octokit.rest.search.issuesAndPullRequests({
        q: `type:pr author:${username} review-requested:${username}`,
        per_page: 100,
      }),
      octokit.rest.activity.listPublicEventsForUser({ username, per_page: 100 }),
    ]);

    const reviewsGiven = Math.min(reviewsGivenRes.data.total_count, 100);
    const reviewsReceived = Math.min(reviewsReceivedRes.data.total_count, 100);

    const collaborators: Record<string, number> = {};
    for (const event of eventsRes.data) {
      if (event.type === "PullRequestReviewEvent" && event.actor?.login !== username) {
        collaborators[event.actor.login] = (collaborators[event.actor.login] ?? 0) + 1;
      }
    }
    const topCollaborators = Object.entries(collaborators)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([login]) => login);

    const forceMultiplierScore = Math.min(100, Math.round((reviewsGiven / Math.max(reviewsGiven + reviewsReceived, 1)) * 100));

    const stats: CollabProfile = {
      reviewsGiven,
      reviewsReceived,
      forceMultiplierScore,
      topCollaborators,
      lastComputedAt: new Date().toISOString(),
    };

    await db
      .insert(profiles)
      .values({ userId, collabStats: stats })
      .onConflictDoUpdate({ target: profiles.userId, set: { collabStats: stats, updatedAt: new Date() } });

    return stats;
  } catch (err) {
    console.error("buildCollabGraph failed:", err);
    return {
      reviewsGiven: 0,
      reviewsReceived: 0,
      forceMultiplierScore: 0,
      topCollaborators: [],
      lastComputedAt: new Date().toISOString(),
    };
  }
}

export async function buildContributionRhythm(
  userId: string,
  username: string
): Promise<ContributionRhythm> {
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });

  if (
    profile?.contributionRhythm &&
    Date.now() - new Date(profile.contributionRhythm.lastComputedAt).getTime() < CACHE_TTL_MS
  ) {
    return profile.contributionRhythm;
  }

  try {
    const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
      username,
      per_page: 100,
    });

    const dayCounts = new Array(7).fill(0);
    let streak = 0;
    let lastDay = "";

    for (const event of events) {
      if (!event.created_at) continue;
      const d = new Date(event.created_at);
      dayCounts[d.getDay()]++;
      
      const dayKey = d.toISOString().slice(0, 10);
      if (lastDay !== dayKey) {
        streak++;
        lastDay = dayKey;
      }
    }

    const mostActiveDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
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
      .values({ userId, contributionRhythm: rhythm })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { contributionRhythm: rhythm, updatedAt: new Date() },
      });

    return rhythm;
  } catch (err) {
    console.error("buildContributionRhythm failed:", err);
    return {
      mostActiveDay: "Unknown",
      streakDays: 0,
      avgPRsPerMonth: 0,
      label: "Infrequent",
      lastComputedAt: new Date().toISOString(),
    };
  }
}
