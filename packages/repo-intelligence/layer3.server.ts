import type {
  EnrichedPR,
  StaticMetrics,
  GraphMetrics,
  ImpactProfile,
  ImpactDimensions,
  ScoreBreakdown,
  FileContribution,
} from "./types";

export async function computeImpactProfile(
  enrichedPR: EnrichedPR,
  staticMetrics: StaticMetrics,
  graphMetrics: GraphMetrics,
): Promise<ImpactProfile> {
  const perFileContributions: FileContribution[] = enrichedPR.diffs.map((d) => {
    const gMetric = graphMetrics.nodeMetrics.find(
      (m) => m.filename === d.filename,
    );
    const sMetric = staticMetrics.fileMetrics.find(
      (m) => m.filename === d.filename,
    );

    // Weight by Graph Importance (PageRank + Betweenness Centrality)
    // Betweenness Centrality is a high-signal metric for architectural load-bearing files.
    const graphWeight =
      (gMetric?.pageRank || 0) * 0.4 +
      ((gMetric?.betweennessCentrality || 0) / 100) * 0.6 +
      (gMetric?.authorityScore || 0) * 0.2;

    const staticWeight =
      (sMetric?.cyclomaticComplexity || 1) * 0.4 +
      ((sMetric?.churnScore || 0) / 100) * 0.1;

    const contribution = Math.min(100, graphWeight * staticWeight * 100);

    return {
      filename: d.filename,
      archScoreContribution: contribution,
      primaryReason:
        contribution > 60
          ? "Critical architectural load-bearing change"
          : contribution > 30
            ? "Significant component modification"
            : "Local feature adjustment",
      changeType: (sMetric?.testToCodeRatio || 0) > 0.5 ? "test" : "feature",
    };
  });

  // Calculate Impact Signature
  //
  // architecturalDisruption was previously based on `graphMetrics.structuralChanges`,
  // which Layer 2 never populated — the dimension was always 0 despite carrying
  // 0.25 weight. Replace with a signal that's actually computed: AST-detected
  // breaking changes (removed exported symbols) and high-PageRank file count.
  const astDiffs = enrichedPR.astDiffs || [];
  const breakingAst = astDiffs.filter(
    (a) => a.semanticChange === "breaking",
  ).length;
  const refactorAst = astDiffs.filter(
    (a) => a.semanticChange === "refactor",
  ).length;
  const highPageRankFiles = graphMetrics.nodeMetrics.filter(
    (m) => m.pageRank > 0.01,
  ).length;
  const hasCycleIntroduction = graphMetrics.globalMetrics.cycleCount > 0;

  const dimensions: ImpactDimensions = {
    architecturalDisruption:
      breakingAst * 30 +
      refactorAst * 10 +
      highPageRankFiles * 8 +
      (hasCycleIntroduction ? 20 : 0),
    riskAndHotspot:
      staticMetrics.overallMetrics.maxChurnScore / 8 +
      staticMetrics.overallMetrics.avgComplexity * 2,
    crossCuttingIndex: enrichedPR.diffs.length * 3,
    knowledgeDispersion: (enrichedPR.codeOwnership?.length || 0) * 5,
    couplingModification: graphMetrics.globalMetrics.density * 200,
    testSurfaceArea:
      enrichedPR.diffs.filter((d) => d.filename.includes("test")).length * 10,
    complexityLoad: staticMetrics.overallMetrics.avgComplexity * 1.5,
    semanticSignificance:
      astDiffs.filter((a) => a.semanticChange !== "none").length * 20,
  };

  // Weighted average for a more accurate ArchScore
  const weights: Record<keyof ImpactDimensions, number> = {
    architecturalDisruption: 0.25,
    riskAndHotspot: 0.15,
    crossCuttingIndex: 0.1,
    knowledgeDispersion: 0.05,
    couplingModification: 0.15,
    testSurfaceArea: 0.1,
    complexityLoad: 0.1,
    semanticSignificance: 0.1,
  };

  const archScore = Math.min(
    100,
    Object.entries(dimensions).reduce((acc, [key, val]) => {
      return (
        acc + Math.min(100, val) * (weights[key as keyof ImpactDimensions] || 0)
      );
    }, 0),
  );

  const breakdown: ScoreBreakdown[] = Object.entries(dimensions).map(
    ([dim, val]) => ({
      dimension: dim,
      rawValue: val,
      normalizedValue: Math.min(100, val),
      weight: weights[dim as keyof ImpactDimensions] || 0,
      contribution:
        Math.min(100, val) * (weights[dim as keyof ImpactDimensions] || 0),
      explanation: `Based on ${dim} metrics including ${dim === "architecturalDisruption" ? "Betweenness Centrality and Modularity" : "calculated static and graph signals"}.`,
    }),
  );

  // Confidence: derive from the spread + signal density rather than ship 0.92
  // as a flat constant. High when multiple dimensions agree (low variance,
  // high signal), lower when most dimensions are 0.
  const dimensionValues = Object.values(dimensions);
  const nonZeroDimensions = dimensionValues.filter((v) => v > 0).length;
  const signalDensity = nonZeroDimensions / dimensionValues.length;
  const confidence = Math.min(0.95, Math.max(0.3, 0.4 + signalDensity * 0.5));

  // riskFactors: surface real risks from the signals we computed instead of
  // emitting a single canned "hotspot" entry.
  const riskFactors: Array<{
    factor: string;
    severity: "low" | "medium" | "high";
    description: string;
    mitigatable: boolean;
  }> = [];
  if (dimensions.riskAndHotspot > 70) {
    riskFactors.push({
      factor: "hotspot",
      severity: "high",
      description: "High churn + complexity combined in changed files",
      mitigatable: true,
    });
  }
  if (breakingAst > 0) {
    riskFactors.push({
      factor: "breaking_change",
      severity: "high",
      description: `${breakingAst} file(s) removed exported symbols`,
      mitigatable: false,
    });
  }
  if (hasCycleIntroduction) {
    riskFactors.push({
      factor: "dependency_cycle",
      severity: "medium",
      description: `Repo dependency graph contains ${graphMetrics.globalMetrics.cycleCount} cycle(s)`,
      mitigatable: true,
    });
  }
  if (dimensions.knowledgeDispersion < 10 && enrichedPR.diffs.length > 5) {
    riskFactors.push({
      factor: "bus_factor",
      severity: "medium",
      description: "Touched files have narrow ownership history",
      mitigatable: true,
    });
  }

  return {
    dimensions,
    archScore,
    archScoreBreakdown: breakdown,
    confidence,
    rawSignals: [],
    perFileContributions,
    riskFactors,
  };
}
