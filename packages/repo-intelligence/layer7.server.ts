import { db } from "@infrastructure/database/db.server";
import { userEvents, reputationHistory } from "@infrastructure/database/schema.server";

import { eq, desc } from "drizzle-orm";
import type { NarrativeDraft } from "./types";

export interface GlobalFeedback {
  avgImpactScore: number;
  popularCategories: Record<string, number>;
  userCorrectionRate: number;
}

export async function getGlobalFeedback(
  userId: string,
): Promise<GlobalFeedback> {
  const events = await db.query.userEvents.findMany({
    where: eq(userEvents.userId, userId),
    orderBy: [desc(userEvents.createdAt)],
    limit: 100,
  });

  const generateEvents = events.filter((e: any) => e.eventType === "generate");
  const editEvents = events.filter((e: any) => e.eventType === "edit_output");

  const totalGenerated = generateEvents.length || 1;
  const totalEdited = editEvents.length;

  const categories: Record<string, number> = {};
  let totalScore = 0;

  generateEvents.forEach((e: any) => {
    const payload = e.payload as any;
    if (payload.category) {
      categories[payload.category] = (categories[payload.category] || 0) + 1;
    }
    if (payload.impactScore) {
      totalScore += payload.impactScore;
    }
  });

  return {
    avgImpactScore: totalScore / totalGenerated,
    popularCategories: categories,
    userCorrectionRate: totalEdited / totalGenerated,
  };
}

export function applyFeedbackLoop(
  draft: NarrativeDraft,
  feedback: GlobalFeedback,
): NarrativeDraft {
  // Continuous hypeScore: scales with avgImpactScore and rises when the user
  // rarely corrects (high acceptance = the model may be too generous).
  // Replaces the two-state `> 80 ? 0.8 : 0.4` ladder.
  const acceptance = 1 - Math.min(1, feedback.userCorrectionRate);
  const hypeScore = Math.min(
    1,
    Math.max(0, (feedback.avgImpactScore || 0) / 100) * 0.7 + acceptance * 0.3,
  );

  return {
    ...draft,
    hypeScore,
    selfConsistencyScore:
      draft.selfConsistencyScore * (1 - feedback.userCorrectionRate),
  };
}

export async function computeCareerVelocity(userId: string): Promise<{
  velocity: number;
  consistency: number;
  impactGrowth: number;
}> {
  const history = await db.query.reputationHistory.findMany({
    where: eq(reputationHistory.userId, userId),
    orderBy: [desc(reputationHistory.weekStarting)],
    limit: 8, // Last 2 months
  });

  if (history.length < 2)
    return { velocity: 0, consistency: 0, impactGrowth: 0 };

  const latest = history[0];
  const previous = history[1];

  return {
    velocity: latest.velocityScore,
    consistency:
      history.filter((h: any) => h.velocityScore > 20).length / history.length,
    impactGrowth:
      ((latest.impactScore - previous.impactScore) /
        (previous.impactScore || 1)) *
      100,
  };
}

export interface UserPreference {
  conciseness: number; // 0-1
  technicalDepth: number; // 0-1
  tone: "aggressive" | "professional" | "humble";
  frequentKeywords: string[];
}

export async function extractUserPreferences(
  userId: string,
): Promise<UserPreference> {
  const events = await db.query.userEvents.findMany({
    where: eq(userEvents.userId, userId),
    orderBy: [desc(userEvents.createdAt)],
    limit: 50,
  });

  const editEvents = events.filter((e: any) => e.eventType === "edit_output");

  let totalLengthDelta = 0;
  let totalBeforeLength = 0;
  const keywordCounts = new Map<string, number>();
  const STOP_WORDS = new Set([
    "the",
    "and",
    "that",
    "this",
    "with",
    "from",
    "your",
    "their",
    "have",
    "been",
    "will",
    "they",
    "what",
    "when",
    "which",
    "system",
    "function",
    "value",
    "should",
    "would",
  ]);

  editEvents.forEach((e: any) => {
    const payload = e.payload as any;
    if (payload.before && payload.after) {
      totalLengthDelta += payload.after.length - payload.before.length;
      totalBeforeLength += payload.before.length;
      const words = payload.after.split(/\s+/);
      words.forEach((w: string) => {
        const lowered = w.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (lowered.length > 5 && !STOP_WORDS.has(lowered)) {
          keywordCounts.set(lowered, (keywordCounts.get(lowered) || 0) + 1);
        }
      });
    }
  });

  // Continuous conciseness: ratio of net deletion to baseline length, clamped.
  // Replaces the prior two-state `< 0 ? 0.8 : 0.4`.
  const conciseness =
    totalBeforeLength > 0
      ? Math.min(
          1,
          Math.max(0, 0.5 - totalLengthDelta / (totalBeforeLength * 2)),
        )
      : 0.5;

  const frequentKeywords = Array.from(keywordCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([k]) => k);

  return {
    conciseness,
    technicalDepth: 0.6, // Default
    tone: "professional",
    frequentKeywords,
  };
}

export async function runLayer7(
  userId: string,
  draft: NarrativeDraft,
): Promise<NarrativeDraft> {
  // Both helpers hit userEvents for the same user. Running them sequentially
  // doubled DB round-trips. Independent — fan out and join.
  const [feedback, preferences] = await Promise.all([
    getGlobalFeedback(userId),
    extractUserPreferences(userId),
  ]);

  const finalDraft = applyFeedbackLoop(draft, feedback);

  // Inject learned preferences into the draft for the next iteration (or final polish)
  finalDraft.userPreferences = preferences;

  // Final Self-Consistency adjustment
  finalDraft.selfConsistencyScore =
    finalDraft.selfConsistencyScore * (1 - feedback.userCorrectionRate * 0.5);

  return finalDraft;
}
