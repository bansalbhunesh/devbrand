import type {
  EnrichedPR,
  StaticMetrics,
  GraphMetrics,
  ImpactProfile,
  ImpactDimensions,
  ScoreBreakdown,
  FileContribution,
} from "./types";

export function computeImpactProfile(
  enrichedPR: EnrichedPR,
  staticMetrics: StaticMetrics,
  graphMetrics: GraphMetrics
): ImpactProfile {
  const perFileContributions: FileContribution[] = enrichedPR.diffs.map(d => {
    const gMetric = graphMetrics.nodeMetrics.find(m => m.filename === d.filename);
    const sMetric = staticMetrics.fileMetrics.find(m => m.filename === d.filename);
    
    // Weight by Graph Importance (PageRank + Authority)
    // Core files will have high scores, leaf components low.
    const graphWeight = (gMetric?.pageRank || 0) * 100 + (gMetric?.authorityScore || 0) * 50;
    const staticWeight = (sMetric?.cyclomaticComplexity || 1) * 0.5 + (sMetric?.churnScore || 0) * 0.1;
    
    const contribution = Math.min(100, graphWeight * staticWeight);

    return {
      filename: d.filename,
      archScoreContribution: contribution,
      primaryReason: contribution > 50 ? "Load-bearing architectural change" : "Component-level feature work",
      changeType: sMetric && sMetric.testToCodeRatio > 0 ? "feature" : "feature", 
    };
  });

  const avgContribution = perFileContributions.reduce((s, c) => s + c.archScoreContribution, 0) / (perFileContributions.length || 1);
  const archScore = Math.min(100, avgContribution * 1.5); // Boost for visibility

  const dimensions: ImpactDimensions = {
    architecturalDisruption: (graphMetrics.structuralChanges?.length || 0) * 10,
    riskAndHotspot: staticMetrics.overallMetrics.maxChurnScore / 10,
    crossCuttingIndex: enrichedPR.diffs.length * 2,
    knowledgeDispersion: enrichedPR.codeOwnership?.length || 0,
    couplingModification: graphMetrics.globalMetrics.density * 100,
    testSurfaceArea: enrichedPR.diffs.filter(d => d.filename.includes("test")).length * 5,
    complexityLoad: staticMetrics.overallMetrics.avgComplexity,
  };

  const breakdown: ScoreBreakdown[] = Object.entries(dimensions).map(([dim, val]) => ({
    dimension: dim,
    rawValue: val,
    normalizedValue: Math.min(100, val),
    weight: 1,
    contribution: Math.min(100, val) / 7,
    explanation: `Calculated based on ${dim}`,
  }));

  return {
    dimensions,
    archScore,
    archScoreBreakdown: breakdown,
    confidence: 0.85,
    rawSignals: [],
    perFileContributions,
    riskFactors: [],
  };
}

