import { describe, it, expect, vi } from "vitest";

// Mock database before any engine import triggers db.ts
vi.mock("../server/db", () => ({
  db: {
    query: { repoGraphs: { findFirst: vi.fn().mockResolvedValue(null) } },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn(),
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));
vi.mock("../server/schema", () => ({
  repoGraphs: { owner: "owner", repo: "repo", computedAt: "computed_at" },
}));

import { analyzeStaticMetrics } from "../server/engine/layer1";
import { computeGraphMetrics } from "../server/engine/layer2";
import { analyzeInvisibleWork } from "../server/engine/layer4";
import type { EnrichedPR, DependencyGraph } from "../server/engine/types";

describe("Engine Robustness & Edge Cases", () => {
  describe("Layer 1: Static Analysis Stress", () => {
    it("should handle empty diffs gracefully", () => {
      const mockPR: Partial<EnrichedPR> = {
        diffs: [],
        astDiffs: [],
      };
      const metrics = analyzeStaticMetrics(mockPR as EnrichedPR);
      expect(metrics.overallMetrics.totalChurn).toBe(0);
      expect(metrics.fileMetrics).toHaveLength(0);
    });

    it("should ignore binary files or files with no patches", () => {
      const mockPR: Partial<EnrichedPR> = {
        diffs: [
          {
            filename: "logo.png",
            status: "added",
            additions: 0,
            deletions: 0,
            patch: "",
          },
          {
            filename: "data.bin",
            status: "modified",
            additions: 100,
            deletions: 100,
            patch: "",
          },
        ],
        astDiffs: [],
      };
      const metrics = analyzeStaticMetrics(mockPR as EnrichedPR);
      expect(metrics.overallMetrics.avgComplexity).toBe(0);
      expect(metrics.fileMetrics[0].cyclomaticComplexity).toBe(0); // 0 for binary/empty
    });
  });

  describe("Layer 2: Graph Logic Edge Cases", () => {
    it("should handle circular dependencies in PageRank", () => {
      const graph: DependencyGraph = {
        nodes: [
          {
            id: "A",
            label: "A",
            type: "source",
            moduleId: "A",
            isEntryPoint: true,
            language: "typescript",
          },
          {
            id: "B",
            label: "B",
            type: "source",
            moduleId: "B",
            isEntryPoint: false,
            language: "typescript",
          },
        ],
        edges: [
          { source: "A", target: "B", type: "import", weight: 1 },
          { source: "B", target: "A", type: "import", weight: 1 },
        ],
        preComputedAt: new Date(),
      };

      const metrics = computeGraphMetrics(graph);
      expect(metrics.nodeMetrics[0].pageRank).toBeCloseTo(0.5, 1);
      expect(metrics.nodeMetrics[1].pageRank).toBeCloseTo(0.5, 1);
    });

    it("should handle completely disconnected nodes", () => {
      const graph: DependencyGraph = {
        nodes: [
          {
            id: "Solo",
            label: "Solo",
            type: "source",
            moduleId: "Solo",
            isEntryPoint: false,
            language: "typescript",
          },
        ],
        edges: [],
        preComputedAt: new Date(),
      };

      const metrics = computeGraphMetrics(graph);
      expect(metrics.nodeMetrics[0].pageRank).toBe(1);
      expect(metrics.globalMetrics.density).toBe(0);
    });
  });

  describe("Layer 4: Invisible Work Heuristics", () => {
    it("should not detect refactoring on purely additions", () => {
      const mockPR: Partial<EnrichedPR> = {
        diffs: [
          {
            filename: "new.ts",
            status: "added",
            additions: 100,
            deletions: 0,
            patch: "many lines",
          },
        ],
        astDiffs: [
          {
            filename: "new.ts",
            beforeSymbols: [],
            afterSymbols: [],
            addedSymbols: [],
            removedSymbols: [],
            changedSymbols: [],
            addedImports: [],
            removedImports: [],
            semanticChange: "none",
          },
        ],
      };
      const metrics = analyzeStaticMetrics(mockPR as EnrichedPR);
      const report = analyzeInvisibleWork(mockPR as EnrichedPR, metrics);
      expect(
        report.categories.find((c) => c.category === "refactoring"),
      ).toBeUndefined();
    });

    it("should detect massive cleanups (Net Negative Churn)", () => {
      const mockPR: Partial<EnrichedPR> = {
        diffs: [
          {
            filename: "legacy.ts",
            status: "modified",
            additions: 5,
            deletions: 500,
            patch: "deleted the world",
          },
        ],
        astDiffs: [
          {
            filename: "legacy.ts",
            beforeSymbols: [],
            afterSymbols: [],
            addedSymbols: [],
            removedSymbols: [],
            changedSymbols: [],
            addedImports: [],
            removedImports: [],
            semanticChange: "refactor",
          },
        ],
      };
      const metrics = analyzeStaticMetrics(mockPR as EnrichedPR);
      const report = analyzeInvisibleWork(mockPR as EnrichedPR, metrics);
      expect(
        report.categories.find((c) => c.category === "tech_debt"),
      ).toBeDefined();
    });
  });
});
