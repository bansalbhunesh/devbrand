import { describe, it, expect } from "vitest";
import { calculateCyclomaticComplexity, calculateChurnScore } from "./layer1";
import { computeGraphMetrics } from "./layer2";
import type { DependencyGraph } from "./types";

describe("Layer 1: Static Metrics", () => {
  it("should calculate cyclomatic complexity correctly", () => {
    const code = `
      function test(a, b) {
        if (a > b) {
          return a;
        } else {
          return b;
        }
      }
    `;
    expect(calculateCyclomaticComplexity(code)).toBe(2); // 1 (base) + 1 (if)
  });

  it("should calculate churn score with decay", () => {
    const score = calculateChurnScore(10, 5, 0);
    expect(score).toBe(15);
    
    const decayedScore = calculateChurnScore(10, 5, 30);
    expect(decayedScore).toBeCloseTo(7.5, 1);
  });
});

describe("Layer 2: Graph Metrics", () => {
  it("should compute PageRank for a simple graph", () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: "A", label: "A", type: "source", moduleId: "A", isEntryPoint: true, language: "typescript" },
        { id: "B", label: "B", type: "source", moduleId: "B", isEntryPoint: false, language: "typescript" },
      ],
      edges: [
        { source: "A", target: "B", type: "import", weight: 1 },
      ],
      preComputedAt: new Date(),
    };

    const metrics = computeGraphMetrics(graph);
    const nodeB = metrics.nodeMetrics.find(m => m.filename === "B");
    const nodeA = metrics.nodeMetrics.find(m => m.filename === "A");

    expect(nodeB?.pageRank).toBeGreaterThan(nodeA?.pageRank || 0);
    expect(nodeB?.authorityScore).toBe(1);
    expect(nodeA?.hubScore).toBe(1);
  });
});
