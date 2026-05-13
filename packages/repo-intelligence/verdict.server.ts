import {
  EnrichedPR,
  GraphImpactReport,
  ImpactProfile,
  StaticMetrics,
  TheVerdict,
  Judgment,
} from "./types";

/**
 * ELITE ARCHITECTURE: The Verdict Engine.
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

    // 1. AI Slop Detection Logic
    const slopScore = this.detectSlop(enrichedPR, staticMetrics);
    if (slopScore > 0.7) {
      redFlags.push("High probability of non-strategic AI-generated code bloat.");
    }

    // 2. Excellence Scoring
    const excellenceScore = this.computeExcellence(graphImpact, impactProfile);
    if (excellenceScore > 0.8) {
      goldStars.push("Exceptional architectural rigor and structural simplification.");
    }

    // 3. Determine Judgment
    const judgment = this.determineJudgment(staticMetrics, impactProfile, graphImpact);

    return {
      summary: this.generateSummary(judgment, excellenceScore, slopScore),
      judgment,
      aiSlopProbability: slopScore,
      engineeringExcellenceScore: excellenceScore,
      redFlags,
      goldStars,
    };
  }

  private detectSlop(pr: EnrichedPR, metrics: StaticMetrics): number {
    let score = 0;

    // Signal: Massive changes with zero semantic shifts
    const semanticDensity = pr.astDiffs.reduce((acc, d) => acc + d.changedSymbols.length, 0) / (pr.metadata.additions || 1);
    if (semanticDensity < 0.05 && pr.metadata.additions > 100) {
      score += 0.4;
    }

    // Signal: Low test coverage for large feature work
    const isFeature = metrics.changeTypeClassification.some(c => c.type === "feature");
    if (isFeature && metrics.overallMetrics.avgChurnRatio > 0.8) {
      const testFiles = pr.metadata.changedFiles > 0 ? pr.diffs.filter(d => d.filename.includes("test")).length : 0;
      if (testFiles === 0) {
        score += 0.3;
      }
    }

    return Math.min(1, score);
  }

  private computeExcellence(graph: GraphImpactReport, profile: ImpactProfile): number {
    let score = profile.archScore / 100;

    // Bonus for breaking cycles or reducing instability
    const cycleReduction = graph.cycleChanges.broken - graph.cycleChanges.introduced;
    if (cycleReduction > 0) score += 0.2;

    return Math.min(1, Math.max(0, score));
  }

  private determineJudgment(metrics: StaticMetrics, profile: ImpactProfile, graph: GraphImpactReport): Judgment {
    const isRefactor = metrics.changeTypeClassification.some(c => c.type === "refactor");
    const isPerf = metrics.changeTypeClassification.some(c => c.type === "performance");

    let intent: Judgment["intent"] = "maintenance";
    if (profile.dimensions.architecturalDisruption > 0.7) intent = "innovation";
    if (isRefactor && graph.cycleChanges.broken > 0) intent = "debt_repayment";

    let quality: Judgment["quality"] = "functional";
    if (profile.dimensions.couplingModification > 0.6) quality = "architectural";
    if (isPerf) quality = "performant";

    let impactVsEffort: Judgment["impactVsEffort"] = "busy_work";
    if (profile.archScore > 50) {
      impactVsEffort = metrics.overallMetrics.totalChurn < 200 ? "low_effort_high_impact" : "high_effort_high_impact";
    }

    return { intent, quality, impactVsEffort };
  }

  private generateSummary(j: Judgment, excellence: number, slop: number): string {
    if (excellence > 0.8) return "A surgical architectural refinement that significantly improves system maintainability.";
    if (slop > 0.7) return "High-volume code addition with minimal semantic value; review for automated slop.";
    return `A ${j.quality} ${j.intent} effort with ${j.impactVsEffort.replace(/_/g, " ")} profile.`;
  }
}
