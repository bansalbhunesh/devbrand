import { describe, it, expect, vi } from "vitest";
import { calculateCyclomaticComplexity, calculateChurnScore } from "./layer1";

// Mock the db module before importing layer2 (which now imports db for caching)
vi.mock("../db.server", () => ({
  db: {
    query: { repoGraphs: { findFirst: vi.fn() } },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn() }),
    }),
  },
}));
vi.mock("../schema.server", () => ({
  repoGraphs: { owner: "owner", repo: "repo", computedAt: "computed_at" },
}));

import { computeGraphMetrics, resolvePath, resolveAlias } from "./layer2";
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
      edges: [{ source: "A", target: "B", type: "import", weight: 1 }],
      preComputedAt: new Date(),
    };

    const metrics = computeGraphMetrics(graph);
    const nodeB = metrics.nodeMetrics.find((m) => m.filename === "B");
    const nodeA = metrics.nodeMetrics.find((m) => m.filename === "A");

    expect(nodeB?.pageRank).toBeGreaterThan(nodeA?.pageRank || 0);
    expect(nodeB?.authorityScore).toBe(1);
    expect(nodeA?.hubScore).toBe(1);
  });
});

describe("Layer 2: Path Alias Resolution", () => {
  it("should resolve @/ aliases to src/", () => {
    expect(resolveAlias("@/lib/utils")).toBe("src/lib/utils");
    expect(resolveAlias("~/components/Nav")).toBe("src/components/Nav");
    expect(resolveAlias("#/server/db")).toBe("src/server/db");
  });

  it("should return null for non-alias paths", () => {
    expect(resolveAlias("./relative/path")).toBeNull();
    expect(resolveAlias("react")).toBeNull();
  });

  it("should resolve alias imports against node list", () => {
    const nodes = [
      "src/lib/utils.ts",
      "src/server/db.ts",
      "src/components/Nav.tsx",
    ];
    expect(resolvePath("src/routes/index.ts", "@/lib/utils", nodes)).toBe(
      "src/lib/utils.ts",
    );
    expect(resolvePath("src/routes/index.ts", "@/server/db", nodes)).toBe(
      "src/server/db.ts",
    );
  });

  it("should handle fuzzy basename matching", () => {
    const nodes = ["src/deep/nested/unique-helper.ts"];
    // Fuzzy match: only one file named "unique-helper" exists
    expect(
      resolvePath("src/routes/index.ts", "some-pkg/unique-helper", nodes),
    ).toBe("src/deep/nested/unique-helper.ts");
  });

  it("should NOT fuzzy match when ambiguous", () => {
    const nodes = ["src/a/utils.ts", "src/b/utils.ts"];
    // Two files named "utils" — should return null to avoid false edges
    expect(
      resolvePath("src/routes/index.ts", "some-pkg/utils", nodes),
    ).toBeNull();
  });
});
