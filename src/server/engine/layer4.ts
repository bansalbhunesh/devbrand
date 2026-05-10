import type {
  EnrichedPR,
  StaticMetrics,
  InvisibleWorkReport,
  InvisibleWorkCategory,
} from "./types";

export function analyzeInvisibleWork(
  enrichedPR: EnrichedPR,
  staticMetrics: StaticMetrics
): InvisibleWorkReport {
  const categories: InvisibleWorkCategory[] = [];

  const refactorFiles = enrichedPR.diffs.filter((d, i) => {
    const isRefactorKeyword = d.patch.toLowerCase().includes("refactor");
    const isSemanticRefactor = enrichedPR.astDiffs[i]?.semanticChange === 'refactor';
    const isBalanced = d.additions > 0 && d.deletions > 0 && Math.abs(d.additions - d.deletions) < 10;
    return isRefactorKeyword || isSemanticRefactor || isBalanced;
  });

  if (refactorFiles.length > 0) {
    const hasSemanticRefactor = enrichedPR.astDiffs.some(a => a.semanticChange === 'refactor');
    categories.push({
      category: "refactoring",
      confidence: hasSemanticRefactor ? 0.95 : 0.8,
      effortEstimate: refactorFiles.length * 2,
      files: refactorFiles.map(f => f.filename),
      evidence: [
        hasSemanticRefactor ? "AST semantic refactor detected" : "Balanced additions/deletions",
        "Refactor keyword found in diff"
      ],
      description: "Structural code improvements without functional change.",
      valueProvided: "Improved maintainability and reduced technical debt.",
    });
  }


  const techDebtFiles = enrichedPR.diffs.filter(d => 
    d.patch.toLowerCase().includes("todo") || 
    d.patch.toLowerCase().includes("fixme") ||
    d.patch.toLowerCase().includes("hack")
  );

  if (techDebtFiles.length > 0) {
    categories.push({
      category: "tech_debt",
      confidence: 0.7,
      effortEstimate: techDebtFiles.length,
      files: techDebtFiles.map(f => f.filename),
      evidence: ["Debt markers found in patch"],
      description: "Addressing known shortcuts or sub-optimal patterns.",
      valueProvided: "Reduced long-term maintenance burden.",
    });
  }

  const invisibleWorkScore = categories.reduce((s, c) => s + c.effortEstimate, 0);

  return {
    categories,
    totalInvisibleEffort: invisibleWorkScore,
    invisibleWorkScore: Math.min(100, invisibleWorkScore * 10),
    effortBreakdown: {
      visibleEffort: enrichedPR.diffs.length,
      invisibleEffort: invisibleWorkScore,
      ratio: invisibleWorkScore / (enrichedPR.diffs.length || 1),
      estimatedTotalHours: (enrichedPR.diffs.length + invisibleWorkScore) * 0.5,
    },
    overlookedIndicators: [],
    detectionConfidence: 0.75,
  };
}
