import type {
  EnrichedPR,
  InvisibleWorkReport,
  InvisibleWorkCategory,
  StaticMetrics,
} from "./types";

export function analyzeInvisibleWork(
  enrichedPR: EnrichedPR,
  _staticMetrics: StaticMetrics,
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
    const symbolsChanged =
      astDiff.removedSymbols.length + astDiff.addedSymbols.length;
    const isHighChurnLowImpact =
      diff.additions > 0 &&
      diff.deletions > 0 &&
      Math.abs(diff.additions - diff.deletions) < 15;
    const isExplicitRefactor =
      astDiff.semanticChange === "refactor" ||
      (diff.patch || "").toLowerCase().includes("refactor");

    if ((symbolsChanged > 0 && isHighChurnLowImpact) || isExplicitRefactor) {
      structuralRefactoringScore += (symbolsChanged || 5) * 2;
      refactoredFiles.push(astDiff.filename);
      refactorEvidence.push(
        `Detected restructuring in ${astDiff.filename}${symbolsChanged > 0 ? ` with ${symbolsChanged} symbol changes` : ""}.`,
      );
    }

    // 2. Code Cleanup / Tech Debt Elimination
    const isCodeCleanup =
      diff.deletions > diff.additions * 2 && diff.deletions > 20;
    // Match as comment-style tokens, not substrings. Previously `"hack"`
    // matched `hackathon`, `hack-week`, anything containing the substring.
    const TECH_DEBT_RE = /\b(TODO|FIXME|HACK|XXX|WORKAROUND)\b/;
    const hasTechDebtMarkers = TECH_DEBT_RE.test(diff.patch || "");

    if (
      isCodeCleanup ||
      hasTechDebtMarkers ||
      astDiff.semanticChange === "refactor"
    ) {
      const cleanupScore = isCodeCleanup ? Math.floor(diff.deletions / 10) : 5;
      codeDeletionScore += cleanupScore;
      cleanupFiles.push(astDiff.filename);
      if (hasTechDebtMarkers) {
        refactorEvidence.push(
          `Addressed technical debt markers in ${astDiff.filename}.`,
        );
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
      valueProvided:
        "Improved maintainability and reduced technical debt through true AST restructuring.",
    });
  }

  if (codeDeletionScore > 0) {
    categories.push({
      category: "tech_debt",
      confidence: 0.9,
      effortEstimate: codeDeletionScore,
      files: [...new Set(cleanupFiles)],
      evidence: ["Significant net-negative code deletion detected."],
      description: "Eliminating dead code or streamlining logic.",
      valueProvided:
        "Reduced surface area for bugs and lower maintenance burden.",
    });
  }

  const invisibleWorkScore = categories.reduce(
    (s, c) => s + c.effortEstimate,
    0,
  );

  // overlookedIndicators: surface real signals that the engine noticed but
  // didn't classify into a category. Replaces the prior hardcoded `[]`.
  const overlookedIndicators: import("./types").OverlookedIndicator[] = [];
  if (refactoredFiles.length > 0 && cleanupFiles.length === 0) {
    overlookedIndicators.push({
      indicator: "Refactor without cleanup",
      evidence: `${refactoredFiles.length} files restructured but no deletion-heavy file detected.`,
      impact: "Architectural improvement may be under-credited.",
      category: "refactoring",
    });
  }
  const pureDeletion = enrichedPR.diffs.filter(
    (d) => d.deletions > 0 && d.additions === 0 && d.deletions > 30,
  );
  if (pureDeletion.length > 0) {
    overlookedIndicators.push({
      indicator: "Pure-deletion files present",
      evidence: `${pureDeletion.length} file(s) with >30 lines removed and no additions.`,
      impact: "Cleanup/tech-debt elimination may be under-credited.",
      category: "tech_debt",
    });
  }

  // detectionConfidence: derive from how much AST signal we actually got.
  // Replaces the prior flat 0.9. When astDiffs are empty (large PR truncated
  // or only binary files), we should be honest about lower confidence.
  const nonEmptyAst = enrichedPR.astDiffs.filter(
    (a) => a.beforeSymbols.length + a.afterSymbols.length > 0,
  ).length;
  const astCoverage =
    enrichedPR.astDiffs.length > 0
      ? nonEmptyAst / enrichedPR.astDiffs.length
      : 0;
  const detectionConfidence = Math.min(
    0.95,
    Math.max(0.4, 0.5 + astCoverage * 0.4),
  );

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
    overlookedIndicators,
    detectionConfidence,
  };
}
