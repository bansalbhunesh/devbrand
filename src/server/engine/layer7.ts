import { db } from "../db";
import { userEvents, reputationHistory } from "../schema";

import { eq, desc } from "drizzle-orm";
import type { NarrativeDraft, ImpactProfile } from "./types";

export interface GlobalFeedback {
  avgImpactScore: number;
  popularCategories: Record<string, number>;
  userCorrectionRate: number;
}

export async function getGlobalFeedback(userId: string): Promise<GlobalFeedback> {
  const events = await db.query.userEvents.findMany({
    where: eq(userEvents.userId, userId),
    orderBy: [desc(userEvents.createdAt)],
    limit: 100,
  });

  const generateEvents = events.filter(e => e.eventType === "generate");
  const editEvents = events.filter(e => e.eventType === "edit_output");

  const totalGenerated = generateEvents.length || 1;
  const totalEdited = editEvents.length;

  const categories: Record<string, number> = {};
  let totalScore = 0;

  generateEvents.forEach(e => {
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
  feedback: GlobalFeedback
): NarrativeDraft {
  // If the user's average impact score is high, we might be over-indexing on hype.
  // Apply a "Hype Score" based on the correction rate and average scores.
  const hypeScore = feedback.avgImpactScore > 80 ? 0.8 : 0.4;

  return {
    ...draft,
    hypeScore,
    // Adjust draft content if needed (e.g., if correction rate is high, lower the confidence)
    selfConsistencyScore: draft.selfConsistencyScore * (1 - feedback.userCorrectionRate),
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

  if (history.length < 2) return { velocity: 0, consistency: 0, impactGrowth: 0 };

  const latest = history[0];
  const previous = history[1];

  return {
    velocity: latest.velocityScore,
    consistency: history.filter(h => h.velocityScore > 20).length / history.length,
    impactGrowth: ((latest.impactScore - previous.impactScore) / (previous.impactScore || 1)) * 100,
  };
}

export async function runLayer7(userId: string, draft: NarrativeDraft): Promise<NarrativeDraft> {
  const feedback = await getGlobalFeedback(userId);
  const velocity = await computeCareerVelocity(userId);
  
  const finalDraft = applyFeedbackLoop(draft, feedback);
  
  // Modulate narrative based on career velocity
  if (velocity.consistency > 0.8) {
    finalDraft.linkedinPost1 += "\n\n(Consistent contributor status verified by DevBrand)";
  }

  return finalDraft;
}

