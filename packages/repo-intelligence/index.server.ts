import { ingestAndPreprocessPR } from "./layer0.server";
import { analyzeStaticMetrics } from "./layer1.server";
import { analyzeDependencyGraph } from "./layer2.server";
import { computeImpactProfile } from "./layer3.server";
import { analyzeInvisibleWork } from "./layer4.server";
import { runLayer5, consumeGeneratorUsage } from "./layer5.server";
import { runLayer6 } from "./layer6.server";
import { consumeLayer6Usage } from "./layer6.server";
import { runLayer7 } from "./layer7.server";
import { sumUsage, type TokenUsage } from "@devbrand/ai-sdk";
import type { NarrativeDraft, UserContext, GraphImpactReport } from "./types";

import { logger } from "../../apps/web/src/lib/logger";

export type EngineResult = {
  narrative: NarrativeDraft;
  usage: TokenUsage;
};

export async function runEngine(
  prUrl: string,
  userId: string,
  context: UserContext,
): Promise<EngineResult> {
  // Reset accumulators so prior runs in the same process don't leak.
  consumeLayer5Usage();
  consumeLayer6Usage();
  try {
    logger.info("Engine start", { userId, prUrl });

    // Layer 0: Ingestion
    const enrichedPR = await ingestAndPreprocessPR(prUrl);
    logger.info("Layer 0 complete", { prUrl });

    // Layer 1: Static Metrics
    const staticMetrics = await analyzeStaticMetrics(enrichedPR);

    // Layer 2: Graph Analysis
    const graphMetrics = await analyzeDependencyGraph(enrichedPR);
    const graphImpactReport: GraphImpactReport = {
      preGraphMetrics: graphMetrics,
      postGraphMetrics: graphMetrics,
      changedNodes: graphMetrics.nodeMetrics,
      propagationReach: [],
      graphEditDistance: 0,
      cycleChanges: { introduced: 0, broken: 0 },
    };

    // Layer 3: Impact Scoring
    const impactProfile = await computeImpactProfile(
      enrichedPR,
      staticMetrics,
      graphMetrics,
    );

    // Layer 4: Invisible Work
    const invisibleWorkReport = await analyzeInvisibleWork(
      enrichedPR,
      staticMetrics,
    );

    // NEW: Extract User Preferences (Layer 7 Active Learning)
    const { extractUserPreferences } = await import("./layer7.server");
    const userPreferences = await extractUserPreferences(userId);

    // Voice memory — feed the user's last 3 edits as few-shot examples.
    // Empty when voice_learning_enabled is false or no edits yet.
    const { getUserVoiceExamples } = await import("../../apps/web/src/server/voice-memory.server");
    const voiceExamples = await getUserVoiceExamples(userId);

    // Layer 5: Narrative Generation
    const narrative = await generateNarrative({
      impactProfile,
      invisibleWorkReport,
      enrichedPR,
      staticMetrics,
      graphImpactReport,
      userContext: context,
      userPreferences,
      voiceExamples,
    });

    // Layer 6: Verification & Evidence Linking (Semantic Upgrade)
    const verifiedNarrative = await runLayer6(
      narrative,
      enrichedPR,
      staticMetrics,
      impactProfile,
    );

    // Layer 7: Feedback Loop & Continuous Learning
    const finalNarrative = await runLayer7(userId, verifiedNarrative);

    const usage = sumUsage([
      consumeLayer5Usage(),
      consumeLayer6Usage(),
    ]) as TokenUsage;

    logger.info("Engine success", {
      userId,
      prUrl,
      impactScore: finalNarrative.impactScore,
      usage,
    });
    return { narrative: finalNarrative, usage };
  } catch (err: any) {
    logger.error(err, { userId, prUrl });
    // Drain accumulators on failure so a half-finished run doesn't poison the next.
    consumeLayer5Usage();
    consumeLayer6Usage();
    throw err;
  }
}

// Re-export so callers don't need to know which submodule defines the helper.
export { ZeroUsage } from "@devbrand/ai-sdk";
