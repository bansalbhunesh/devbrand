import type {
  EnrichedPR,
  StaticMetrics,
  FileMetrics,
  OverallMetrics,
  ChangeType,
  FileDiff,
} from "./types";

export function calculateChurnScore(
  additions: number,
  deletions: number,
  daysSinceChange: number = 0
): number {
  const HALF_LIFE_DAYS = 30;
  const decayFactor = Math.pow(0.5, daysSinceChange / HALF_LIFE_DAYS);
  return (additions + deletions) * decayFactor;
}

export function calculateCyclomaticComplexity(code: string): number {
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if/g,
    /\bwhile\s*\(/g,
    /\bfor\s*\(/g,
    /\bswitch\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\s*[^?]+\s*:/g,
    /\&\&/g,
    /\|\|/g,
  ];

  let complexity = 1;
  const cleanCode = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, ""); 

  for (const pattern of patterns) {
    const matches = cleanCode.match(pattern);
    if (matches) complexity += matches.length;
  }

  return complexity;
}

export function calculateHalsteadMetrics(code: string) {
  const operators = ["+", "-", "*", "/", "=", "==", "!=", "&&", "||", "if", "for", "while", "return"];
  const tokens = code.split(/\s+/).filter(Boolean);
  
  const n1 = new Set(tokens.filter(t => operators.includes(t))).size;
  const n2 = new Set(tokens.filter(t => !operators.includes(t))).size;
  const N1 = tokens.filter(t => operators.includes(t)).length;
  const N2 = tokens.filter(t => !operators.includes(t)).length;

  const N = N1 + N2;
  const n = n1 + n2;
  const volume = N > 0 && n > 0 ? N * Math.log2(n) : 0;
  const difficulty = n2 > 0 ? (n1 / 2) * (N2 / n2) : 0;

  return { volume, difficulty };
}

export function classifyChangeType(diff: FileDiff): ChangeType {
  const filename = diff.filename.toLowerCase();
  const patch = diff.patch.toLowerCase();

  if (filename.endsWith(".md") || filename.endsWith(".json")) {
    return { type: "documentation", description: "Doc update", files: [diff.filename] };
  }
  if (patch.includes("security") || patch.includes("auth")) {
    return { type: "security", description: "Security fix", files: [diff.filename], severity: "high" };
  }
  if (patch.includes("fix") || patch.includes("bug")) {
    return { type: "bug_fix", description: "Bug fix", files: [diff.filename], severity: "medium" };
  }
  if (patch.includes("performance") || patch.includes("optimize")) {
    return { type: "performance", description: "Performance improv", files: [diff.filename] };
  }
  
  return { type: "feature", description: "Feature work", files: [diff.filename] };
}

export function analyzeStaticMetrics(enrichedPR: EnrichedPR): StaticMetrics {
  const fileMetrics: FileMetrics[] = enrichedPR.diffs.map((diff) => {
    const codeToAnalyze = diff.fullContent || diff.patch;
    const complexity = calculateCyclomaticComplexity(codeToAnalyze);
    const halstead = calculateHalsteadMetrics(codeToAnalyze);

    return {
      filename: diff.filename,
      churnScore: calculateChurnScore(diff.additions, diff.deletions),
      churnRatio: (diff.additions + diff.deletions) / 100, 
      cyclomaticComplexity: complexity,
      halsteadVolume: halstead.volume,
      halsteadDifficulty: halstead.difficulty,
      linesAdded: diff.additions,
      linesDeleted: diff.deletions,
      testToCodeRatio: diff.filename.includes("test") ? 1 : 0,
    };
  });

  const overallMetrics: OverallMetrics = {
    totalChurn: fileMetrics.reduce((s, m) => s + m.churnScore, 0),
    avgChurnRatio: fileMetrics.reduce((s, m) => s + m.churnRatio, 0) / fileMetrics.length,
    maxChurnScore: Math.max(...fileMetrics.map(m => m.churnScore)),
    avgComplexity: fileMetrics.reduce((s, m) => s + m.cyclomaticComplexity, 0) / fileMetrics.length,
    totalComplexityDelta: 0,
  };

  return {
    fileMetrics,
    overallMetrics,
    changeTypeClassification: enrichedPR.diffs.map(classifyChangeType),
  };
}
