import {
  EnrichedPR,
  GraphImpactReport,
  ImpactProfile,
  StaticMetrics,
  TheVerdict,
  Judgment,
  VerdictCategories,
} from "./types";

/**
 * ELITE ARCHITECTURE: The Verdict Engine v2 (Brutally Honest Judgment).
 * Evaluates the "Truth" of a Pull Request by cross-referencing static metrics,
 * graph disruption, and semantic shifts.
 */
export class VerdictEngine {
  public computeVerdict(
    enrichedPR: EnrichedPR,
    staticMetrics: StaticMetrics,
    graphImpact: GraphImpactReport,
    impactProfile: ImpactProfile,
  ): TheVerdict {
    const redFlags: string[] = [];
    const goldStars: string[] = [];

    // 1. Specialized Verdict Categories
    const categories = this.computeCategories(
      enrichedPR,
      staticMetrics,
      graphImpact,
      impactProfile,
    );

    // 2. Aggregate Red Flags / Gold Stars
    if (categories.aiSlop.score > 0.7) {
      redFlags.push("High probability of non-strategic AI-generated code bloat.");
    }
    if (categories.maintainability.futureChaosRisk > 0.7) {
      redFlags.push("Complexity accelerating faster than test coverage; imminent tech debt explosion.");
    }
    if (categories.architecture.couplingSeverity > 0.8) {
      redFlags.push("Critical coupling detected: this change may ripple across isolated domains.");
    }
    if (categories.maintainability.score > 0.8) {
      goldStars.push("Exceptional architectural rigor and structural simplification.");
    }

    // 3. Determine Judgment Persona
    const judgment = this.determineJudgment(staticMetrics, impactProfile, graphImpact);

    return {
      summary: this.generateSummary(judgment, categories),
      judgment,
      aiSlopProbability: categories.aiSlop.score,
      engineeringExcellenceScore: 1 - categories.maintainability.futureChaosRisk,
      categories,
      redFlags,
      goldStars,
    };
  }

  private computeCategories(
    pr: EnrichedPR,
    metrics: StaticMetrics,
    graph: GraphImpactReport,
    profile: ImpactProfile,
  ): VerdictCategories {
    const slopScore = this.detectSlop(pr, metrics);
    const m = metrics.overallMetrics;

    return {
      maintainability: {
        score: Math.max(0, 1 - (m.avgComplexity / 50 + m.maxChurnScore / 100)),
        futureChaosRisk: (m.totalComplexityDelta > 10 ? 0.6 : 0.2) + (profile.riskAndHotspot / 1.5),
        onboardingFriction: profile.dimensions.architecturalDisruption * 0.8,
        rewriteProbability: (m.avgComplexity > 30 ? 0.5 : 0.1) + (slopScore * 0.4),
      },
      aiSlop: {
        score: slopScore,
        fakeAbstractionDensity: slopScore > 0.5 ? 0.7 : 0.2,
        hallucinatedArchRisk: slopScore > 0.8 ? 0.6 : 0.1,
      },
      architecture: {
        couplingSeverity: profile.dimensions.couplingModification,
        scalabilityConfidence: 1 - profile.dimensions.riskAndHotspot,
        maturityStage: this.inferMaturity(profile, graph),
      },
      culture: {
        persona: this.inferPersona(pr, metrics, profile),
        velocityVsRigor: 1 - (m.totalChurn / 1000), // simplistic velocity proxy
      },
    };
  }

  private detectSlop(pr: EnrichedPR, metrics: StaticMetrics): number {
    let score = 0;
    const semanticDensity = pr.astDiffs.reduce((acc, d) => acc + d.changedSymbols.length, 0) / (pr.metadata.additions || 1);
    
    if (semanticDensity < 0.05 && pr.metadata.additions > 100) score += 0.5;
    
    const isFeature = metrics.changeTypeClassification.some(c => c.type === "feature");
    if (isFeature) {
      const testFiles = pr.diffs.filter(d => d.filename.toLowerCase().includes("test")).length;
      if (testFiles === 0) score += 0.4;
    }

    return Math.min(1, score);
  }

  private inferMaturity(profile: ImpactProfile, graph: GraphImpactReport): VerdictCategories["architecture"]["maturityStage"] {
    if (profile.archScore > 80) return "overengineered";
    if (graph.cycleChanges.broken > 0) return "mature";
    if (profile.dimensions.architecturalDisruption > 0.6) return "scaling";
    return "mvp";
  }

  private inferPersona(pr: EnrichedPR, metrics: StaticMetrics, profile: ImpactProfile): string {
    const slop = this.detectSlop(pr, metrics);
    if (slop > 0.7) return "AI-Generated Architecture Maximalist";
    if (profile.dimensions.architecturalDisruption > 0.8) return "Ex-FAANG Reliability Engineer";
    if (metrics.overallMetrics.totalChurn > 1000 && profile.archScore < 30) return "Startup Speed Demon";
    if (pr.astDiffs.some(d => d.semanticChange === "refactor") && profile.archScore > 50) return "Structural Purist";
    
    return "Full-Stack Pragmatist";
  }

  private determineJudgment(metrics: StaticMetrics, profile: ImpactProfile, graph: GraphImpactReport): Judgment {
    const isRefactor = metrics.changeTypeClassification.some(c => c.type === "refactor");
    
    let intent: Judgment["intent"] = "maintenance";
    if (profile.dimensions.architecturalDisruption > 0.7) intent = "innovation";
    if (isRefactor && graph.cycleChanges.broken > 0) intent = "debt_repayment";

    let quality: Judgment["quality"] = "functional";
    if (profile.dimensions.couplingModification > 0.6) quality = "architectural";

    let impactVsEffort: Judgment["impactVsEffort"] = "busy_work";
    if (profile.archScore > 40) {
      impactVsEffort = metrics.overallMetrics.totalChurn < 300 ? "low_effort_high_impact" : "high_effort_high_impact";
    }

    return { intent, quality, impactVsEffort };
  }

  private generateSummary(j: Judgment, c: VerdictCategories): string {
    const p = c.culture.persona;
    if (c.aiSlop.score > 0.7) return `Verdict: A heavy infusion of AI slop. Looks like ${p} energy. High risk of future rewrite.`;
    if (c.maintainability.score > 0.8) return `Verdict: Surgical refinement. This is ${p} work. Impact is ${j.impactVsEffort.replace(/_/g, " ")}.`;
    return `Verdict: A ${j.quality} ${j.intent} phase by a ${p}.`;
  }
}
