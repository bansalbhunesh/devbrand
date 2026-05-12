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
  daysSinceChange: number = 0,
): number {
  const HALF_LIFE_DAYS = 30;
  const decayFactor = Math.pow(0.5, daysSinceChange / HALF_LIFE_DAYS);
  return (additions + deletions) * decayFactor;
}

import { parse, type ParseResult } from "@babel/parser";
import type { File } from "@babel/types";
import _traverse from "@babel/traverse";
const traverse =
  typeof _traverse === "function" ? _traverse : (_traverse as any).default;

function parseSafe(code: string): ParseResult<File> | null {
  if (!code || !code.trim()) return null;
  try {
    return parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx", "decorators-legacy"],
      errorRecovery: true,
    });
  } catch {
    return null;
  }
}

function complexityFromAst(ast: ParseResult<File>): number {
  let complexity = 1;
  traverse(ast, {
    IfStatement() {
      complexity++;
    },
    WhileStatement() {
      complexity++;
    },
    ForStatement() {
      complexity++;
    },
    ForInStatement() {
      complexity++;
    },
    ForOfStatement() {
      complexity++;
    },
    CatchClause() {
      complexity++;
    },
    ConditionalExpression() {
      complexity++;
    },
    LogicalExpression(path: any) {
      if (path.node.operator === "&&" || path.node.operator === "||") {
        complexity++;
      }
    },
    SwitchCase(path: any) {
      if (path.node.test) complexity++; // exclude default
    },
  });
  return complexity;
}

function halsteadFromAst(ast: ParseResult<File>): {
  volume: number;
  difficulty: number;
} {
  const operators = new Set<string>();
  const operands = new Set<string>();
  let N1 = 0;
  let N2 = 0;

  traverse(ast, {
    Identifier(path: any) {
      operands.add(path.node.name);
      N2++;
    },
    StringLiteral(path: any) {
      operands.add(path.node.value);
      N2++;
    },
    NumericLiteral(path: any) {
      operands.add(path.node.value.toString());
      N2++;
    },
    BinaryExpression(path: any) {
      operators.add(path.node.operator);
      N1++;
    },
    LogicalExpression(path: any) {
      operators.add(path.node.operator);
      N1++;
    },
    UnaryExpression(path: any) {
      operators.add(path.node.operator);
      N1++;
    },
    AssignmentExpression(path: any) {
      operators.add(path.node.operator);
      N1++;
    },
    UpdateExpression(path: any) {
      operators.add(path.node.operator);
      N1++;
    },
    CallExpression() {
      operators.add("()");
      N1++;
    },
    MemberExpression() {
      operators.add(".");
      N1++;
    },
  });

  const n1 = operators.size;
  const n2 = operands.size;
  const N = N1 + N2;
  const n = n1 + n2;
  const volume = N > 0 && n > 0 ? N * Math.log2(n) : 0;
  const difficulty = n2 > 0 ? (n1 / 2) * (N2 / n2) : 0;
  return { volume, difficulty };
}

export function calculateCyclomaticComplexity(code: string): number {
  const ast = parseSafe(code);
  if (!ast) {
    if (!code || !code.trim()) return 1;
    // Fallback to a coarse line-density estimate for unparseable input.
    return 1 + Math.floor(code.split("\n").length / 50);
  }
  return complexityFromAst(ast);
}

export function calculateHalsteadMetrics(code: string) {
  const ast = parseSafe(code);
  if (!ast) return { volume: 0, difficulty: 0 };
  return halsteadFromAst(ast);
}

/**
 * Single-parse helper: produce both metrics in one AST traversal pass.
 * The free-standing `calculateCyclomaticComplexity` / `calculateHalsteadMetrics`
 * remain exported for backward compatibility with tests.
 */
function analyzeFileOnce(code: string): {
  complexity: number;
  volume: number;
  difficulty: number;
} {
  const ast = parseSafe(code);
  if (!ast) {
    const fallbackComplexity =
      !code || !code.trim() ? 1 : 1 + Math.floor(code.split("\n").length / 50);
    return { complexity: fallbackComplexity, volume: 0, difficulty: 0 };
  }
  const complexity = complexityFromAst(ast);
  const { volume, difficulty } = halsteadFromAst(ast);
  return { complexity, volume, difficulty };
}

// Word-boundary matchers. Substring matching produced false positives on
// "author/authorization" (security) and "prefix/suffix" (bug_fix) — every
// patch that mentioned an author or used the word prefix was being flagged
// as a security-severity-high change.
const SECURITY_RE =
  /\b(security|csrf|xss|injection|sanitiz|sso|oauth|jwt|secret|credential|password|token)\b/i;
const BUGFIX_RE =
  /\b(fix(?:es|ed)?|bug(?:fix|s)?|defect|regression|crash|hotfix)\b/i;
const PERF_RE =
  /\b(perf|performance|optimi[sz]e[ds]?|latency|throughput|memoiz|cache)\b/i;

export function classifyChangeType(diff: FileDiff): ChangeType {
  const filename = (diff.filename || "").toLowerCase();
  const patch = diff.patch || "";

  if (filename.endsWith(".md") || filename.endsWith(".json")) {
    return {
      type: "documentation",
      description: "Doc update",
      files: [diff.filename],
    };
  }
  if (SECURITY_RE.test(patch)) {
    return {
      type: "security",
      description: "Security fix",
      files: [diff.filename],
      severity: "high",
    };
  }
  if (BUGFIX_RE.test(patch)) {
    return {
      type: "bug_fix",
      description: "Bug fix",
      files: [diff.filename],
      severity: "medium",
    };
  }
  if (PERF_RE.test(patch)) {
    return {
      type: "performance",
      description: "Performance improv",
      files: [diff.filename],
    };
  }

  return {
    type: "feature",
    description: "Feature work",
    files: [diff.filename],
  };
}

export function analyzeStaticMetrics(enrichedPR: EnrichedPR): StaticMetrics {
  const fileMetrics: FileMetrics[] = enrichedPR.diffs.map((diff) => {
    const codeToAnalyze = diff.fullContent || diff.patch;
    const hasContent = !!(codeToAnalyze && codeToAnalyze.trim());

    // Single AST parse for both complexity and Halstead — was previously
    // parsing the same file twice.
    const { complexity, volume, difficulty } = hasContent
      ? analyzeFileOnce(codeToAnalyze)
      : { complexity: 0, volume: 0, difficulty: 0 };

    return {
      filename: diff.filename,
      churnScore: calculateChurnScore(diff.additions, diff.deletions),
      churnRatio: (diff.additions + diff.deletions) / 100,
      cyclomaticComplexity: complexity || (hasContent ? 1 : 0),
      halsteadVolume: volume,
      halsteadDifficulty: difficulty,
      linesAdded: diff.additions,
      linesDeleted: diff.deletions,
      // Was misnamed `testToCodeRatio` — it's actually a boolean cast to 1/0.
      // Keeping the field name for backward compatibility with existing DB rows.
      testToCodeRatio: diff.filename.includes("test") ? 1 : 0,
    };
  });

  // Compute totalComplexityDelta from astDiffs where we know which symbols
  // were added vs removed. This replaces the prior hardcoded 0.
  const totalComplexityDelta = (enrichedPR.astDiffs || []).reduce(
    (acc, ad) => acc + (ad.addedSymbols.length - ad.removedSymbols.length),
    0,
  );

  // Guard against empty PRs (only binary files, or post-filter empty diff list).
  // Without these guards we previously emitted NaN and -Infinity into the
  // downstream impact profile.
  const n = fileMetrics.length;
  const overallMetrics: OverallMetrics = {
    totalChurn: fileMetrics.reduce((s, m) => s + m.churnScore, 0),
    avgChurnRatio:
      n > 0 ? fileMetrics.reduce((s, m) => s + m.churnRatio, 0) / n : 0,
    maxChurnScore:
      n > 0 ? Math.max(...fileMetrics.map((m) => m.churnScore)) : 0,
    avgComplexity:
      n > 0
        ? fileMetrics.reduce((s, m) => s + m.cyclomaticComplexity, 0) / n
        : 0,
    totalComplexityDelta,
  };

  return {
    fileMetrics,
    overallMetrics,
    changeTypeClassification: enrichedPR.diffs.map(classifyChangeType),
  };
}
