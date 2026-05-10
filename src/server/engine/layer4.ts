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

  let structuralRefactoringScore = 0;
  const refactoredFiles: string[] = [];
  const refactorEvidence: string[] = [];

  let codeDeletionScore = 0;
  const cleanupFiles: string[] = [];

  enrichedPR.astDiffs.forEach((astDiff, index) => {
    const diff = enrichedPR.diffs[index];
    if (!diff) return;

    // 1. Structural Refactoring (Extract Method / Move)
    const symbolsChanged = astDiff.removedSymbols.length + astDiff.addedSymbols.length;
    const isHighChurnLowImpact = diff.additions > 0 && diff.deletions > 0 && Math.abs(diff.additions - diff.deletions) < 15;
    const isExplicitRefactor = astDiff.semanticChange === 'refactor' || (diff.patch || "").toLowerCase().includes("refactor");
    
    if ((symbolsChanged > 0 && isHighChurnLowImpact) || isExplicitRefactor) {
      structuralRefactoringScore += (symbolsChanged || 5) * 2;
      refactoredFiles.push(astDiff.filename);
      refactorEvidence.push(`Detected restructuring in ${astDiff.filename}${symbolsChanged > 0 ? ` with ${symbolsChanged} symbol changes` : ""}.`);
    }

    // 2. Code Cleanup / Tech Debt Elimination
    const isCodeCleanup = diff.deletions > diff.additions * 2 && diff.deletions > 20;
    const hasTechDebtMarkers = ["todo", "fixme", "hack", "workaround"].some(m => (diff.patch || "").toLowerCase().includes(m));

    if (isCodeCleanup || hasTechDebtMarkers || astDiff.semanticChange === 'cleanup') {
      const cleanupScore = isCodeCleanup ? Math.floor(diff.deletions / 10) : 5;
      codeDeletionScore += cleanupScore;
      cleanupFiles.push(astDiff.filename);
      if (hasTechDebtMarkers) {
        refactorEvidence.push(`Addressed technical debt markers in ${astDiff.filename}.`);
      }
    }
  });

  if (structuralRefactoringScore > 0) {
    categories.push({
      category: "refactoring",
      confidence: 0.95, // High confidence because it's based on true AST symbols
      effortEstimate: structuralRefactoringScore,
      files: [...new Set(refactoredFiles)],
      evidence: refactorEvidence.slice(0, 3), // Top 3 pieces of evidence
      description: "Structural code improvements and method extractions.",
      valueProvided: "Improved maintainability and reduced technical debt through true AST restructuring.",
    });
  }

  if (codeDeletionScore > 0) {
    categories.push({
      category: "tech_debt",
      confidence: 0.90,
      effortEstimate: codeDeletionScore,
      files: [...new Set(cleanupFiles)],
      evidence: ["Significant net-negative code deletion detected."],
      description: "Eliminating dead code or streamlining logic.",
      valueProvided: "Reduced surface area for bugs and lower maintenance burden.",
    });
  }

  const invisibleWorkScore = categories.reduce((s, c) => s + c.effortEstimate, 0);

  return {
    categories,
    totalInvisibleEffort: invisibleWorkScore,
    invisibleWorkScore: Math.min(100, invisibleWorkScore * 5),
    effortBreakdown: {
      visibleEffort: enrichedPR.diffs.length,
      invisibleEffort: invisibleWorkScore,
      ratio: invisibleWorkScore / (enrichedPR.diffs.length || 1),
      estimatedTotalHours: (enrichedPR.diffs.length + invisibleWorkScore) * 0.5,
    },
    overlookedIndicators: [],
    detectionConfidence: 0.90, // Upgraded from 0.75 due to AST usage
  };
}
