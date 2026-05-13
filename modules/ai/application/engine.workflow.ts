import { Workflow, WorkflowContext } from "@/modules/core/workflow/workflow.base";
import { EventBus } from "@/modules/core/events/event-bus";
import { ingestAndPreprocessPR } from "@/server/engine/layer0.server";
import { analyzeStaticMetrics } from "@/server/engine/layer1.server";
import { analyzeDependencyGraph } from "@/server/engine/layer2.server";
import { computeImpactProfile } from "@/server/engine/layer3.server";
import { analyzeInvisibleWork } from "@/server/engine/layer4.server";
import { generateNarrative, consumeGeneratorUsage } from "@/modules/ai/infrastructure/narrative.generator";
import { runLayer6, consumeLayer6Usage } from "@/server/engine/layer6.server";
import { runLayer7 } from "@/server/engine/layer7.server";
import { sumUsage, type TokenUsage } from "@/modules/ai/infrastructure/llm.gateway";
import type { UserContext, NarrativeDraft, GraphImpactReport } from "@/server/engine/types";

export interface EngineInput {
  prUrl: string;
  context: UserContext;
}

export interface EngineOutput {
  narrative: NarrativeDraft;
  usage: TokenUsage;
}

export class EngineWorkflow extends Workflow<EngineInput, EngineOutput> {
  protected name = "AIEnginePipeline";

  constructor(eventBus: EventBus) {
    super(eventBus);
  }

  protected async execute(input: EngineInput, context: WorkflowContext): Promise<EngineOutput> {
    const { prUrl, context: userContext } = input;
    const { userId, jobId } = context;

    // Reset accumulators
    consumeGeneratorUsage();
    consumeLayer6Usage();

    await this.updateStep(jobId, "L0: Ingestion");
    const enrichedPR = await ingestAndPreprocessPR(prUrl);

    await this.updateStep(jobId, "L1: Static Metrics");
    const staticMetrics = await analyzeStaticMetrics(enrichedPR);

    await this.updateStep(jobId, "L2: Graph Analysis");
    const graphMetrics = await analyzeDependencyGraph(enrichedPR);
    const graphImpactReport: GraphImpactReport = {
      preGraphMetrics: graphMetrics,
      postGraphMetrics: graphMetrics,
      changedNodes: graphMetrics.nodeMetrics,
      propagationReach: [],
      graphEditDistance: 0,
      cycleChanges: { introduced: 0, broken: 0 },
    };

    await this.updateStep(jobId, "L3: Impact Scoring");
    const impactProfile = await computeImpactProfile(enrichedPR, staticMetrics, graphMetrics);

    await this.updateStep(jobId, "L4: Invisible Work");
    const invisibleWorkReport = await analyzeInvisibleWork(enrichedPR, staticMetrics);

    await this.updateStep(jobId, "L7: Preference Learning");
    const { extractUserPreferences } = await import("@/server/engine/layer7.server");
    const userPreferences = await extractUserPreferences(userId);

    await this.updateStep(jobId, "Voice Calibration");
    const { getUserVoiceExamples } = await import("@/server/voice-memory.server");
    const voiceExamples = await getUserVoiceExamples(userId);

    await this.updateStep(jobId, "Narrative Generation");
    const narrative = await generateNarrative({
      impactProfile,
      invisibleWorkReport,
      enrichedPR,
      staticMetrics,
      graphImpactReport,
      userContext,
      userPreferences,
      voiceExamples,
    });

    await this.updateStep(jobId, "L6: Verification");
    const verifiedNarrative = await runLayer6(narrative, enrichedPR, staticMetrics, impactProfile);

    await this.updateStep(jobId, "L7: Final Polish");
    const finalNarrative = await runLayer7(userId, verifiedNarrative);

    const usage = sumUsage([consumeGeneratorUsage(), consumeLayer6Usage()]) as TokenUsage;

    return { narrative: finalNarrative, usage };
  }
}
