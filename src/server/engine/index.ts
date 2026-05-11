import { ingestAndPreprocessPR } from "./layer0";
import { analyzeStaticMetrics } from "./layer1";
import { analyzeDependencyGraph } from "./layer2";
import { computeImpactProfile } from "./layer3";
import { analyzeInvisibleWork } from "./layer4";
import { generateNarrative } from "./layer5";
import { runLayer6 } from "./layer6";
import { runLayer7 } from "./layer7";
import type { NarrativeDraft, UserContext, GraphImpactReport, GraphMetrics } from "./types";

import { logger } from "@/lib/logger";

export async function runEngine(prUrl: string, userId: string, context: UserContext): Promise<NarrativeDraft> {
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
    const impactProfile = await computeImpactProfile(enrichedPR, staticMetrics, graphMetrics);

    // Layer 4: Invisible Work
    const invisibleWorkReport = await analyzeInvisibleWork(enrichedPR, staticMetrics);

    // NEW: Extract User Preferences (Layer 7 Active Learning)
    const { extractUserPreferences } = await import("./layer7");
    const userPreferences = await extractUserPreferences(userId);

    // Layer 5: Narrative Generation
    const narrative = await generateNarrative({
      impactProfile,
      invisibleWorkReport,
      enrichedPR,
      staticMetrics,
      graphImpactReport,
      userContext: context,
      userPreferences,
    });

    // Layer 6: Verification & Evidence Linking (Semantic Upgrade)
    const verifiedNarrative = await runLayer6(narrative, enrichedPR, staticMetrics, impactProfile);


    // Layer 7: Feedback Loop & Continuous Learning
    const finalNarrative = await runLayer7(userId, verifiedNarrative);

    logger.info("Engine success", { userId, prUrl, impactScore: finalNarrative.impactScore });
    return finalNarrative;
  } catch (err: any) {
    logger.error(err, { userId, prUrl });
    throw err;
  }
}

