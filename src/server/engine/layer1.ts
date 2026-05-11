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

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = typeof _traverse === 'function' ? _traverse : (_traverse as any).default;

export function calculateCyclomaticComplexity(code: string): number {
  if (!code || !code.trim()) return 1;
  let complexity = 1;
  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx", "decorators-legacy"],
      errorRecovery: true,
    });
    
    traverse(ast, {
      IfStatement() { complexity++; },
      WhileStatement() { complexity++; },
      ForStatement() { complexity++; },
      ForInStatement() { complexity++; },
      ForOfStatement() { complexity++; },
      CatchClause() { complexity++; },
      ConditionalExpression() { complexity++; },
      LogicalExpression(path: any) {
        if (path.node.operator === "&&" || path.node.operator === "||") {
          complexity++;
        }
      },
      SwitchCase(path: any) {
        if (path.node.test) complexity++; // exclude default
      }
    });
  } catch (e) {
    // Fallback to basic length approximation if extremely malformed
    return 1 + Math.floor(code.split('\n').length / 50);
  }
  return complexity;
}

export function calculateHalsteadMetrics(code: string) {
  if (!code || !code.trim()) return { volume: 0, difficulty: 0 };
  
  const operators = new Set<string>();
  const operands = new Set<string>();
  let N1 = 0; // total operators
  let N2 = 0; // total operands

  try {
    const ast = parse(code, {
      sourceType: "module",
      plugins: ["typescript", "jsx", "decorators-legacy"],
      errorRecovery: true,
    });

    traverse(ast, {
      Identifier(path: any) { operands.add(path.node.name); N2++; },
      StringLiteral(path: any) { operands.add(path.node.value); N2++; },
      NumericLiteral(path: any) { operands.add(path.node.value.toString()); N2++; },
      BinaryExpression(path: any) { operators.add(path.node.operator); N1++; },
      LogicalExpression(path: any) { operators.add(path.node.operator); N1++; },
      UnaryExpression(path: any) { operators.add(path.node.operator); N1++; },
      AssignmentExpression(path: any) { operators.add(path.node.operator); N1++; },
      UpdateExpression(path: any) { operators.add(path.node.operator); N1++; },
      CallExpression(_path: any) { operators.add('()'); N1++; },
      MemberExpression(_path: any) { operators.add('.'); N1++; }
    });
  } catch (e) {
    return { volume: 0, difficulty: 0 };
  }

  const n1 = operators.size;
  const n2 = operands.size;
  const N = N1 + N2;
  const n = n1 + n2;
  const volume = N > 0 && n > 0 ? N * Math.log2(n) : 0;
  const difficulty = n2 > 0 ? (n1 / 2) * (N2 / n2) : 0;

  return { volume, difficulty };
}

export function classifyChangeType(diff: FileDiff): ChangeType {
  const filename = (diff.filename || "").toLowerCase();
  const patch = (diff.patch || "").toLowerCase();

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
    const hasContent = !!(codeToAnalyze && codeToAnalyze.trim());
    const complexity = hasContent ? calculateCyclomaticComplexity(codeToAnalyze) : 0;
    const halstead = hasContent ? calculateHalsteadMetrics(codeToAnalyze) : { volume: 0, difficulty: 0 };

    return {
      filename: diff.filename,
      churnScore: calculateChurnScore(diff.additions, diff.deletions),
      churnRatio: (diff.additions + diff.deletions) / 100, 
      cyclomaticComplexity: complexity || (hasContent ? 1 : 0),
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
