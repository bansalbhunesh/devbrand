import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database before any engine import triggers db.ts
vi.mock("../server/db", () => ({
  db: {
    query: { repoGraphs: { findFirst: vi.fn().mockResolvedValue(null) } },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoUpdate: vi.fn(), returning: vi.fn().mockResolvedValue([]) }) }),
  },
}));
vi.mock("../server/schema", () => ({
  repoGraphs: { owner: "owner", repo: "repo", computedAt: "computed_at" },
}));
import { runLayer6, verifyCitations, computeSelfConsistency } from "../server/engine/layer6";
import { analyzeStaticMetrics, calculateCyclomaticComplexity, calculateChurnScore } from "../server/engine/layer1";
import { computeGraphMetrics, resolvePath } from "../server/engine/layer2";
import { computeImpactProfile } from "../server/engine/layer3";
import { analyzeInvisibleWork } from "../server/engine/layer4";
import type { DependencyGraph, EnrichedPR, NarrativeDraft, StaticMetrics, ImpactProfile } from "../server/engine/types";

// Mock the Anthropic SDK globally for Layer 6 semantic verification
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify({ verified: true, reason: "Claim matches the diff content" }) }],
      }),
    };
  },
}));

// ─── Layer 1: Static Metrics ─────────────────────────────────────────────
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
    expect(calculateCyclomaticComplexity(code)).toBe(2);
  });

  it("should handle complex control flow", () => {
    const code = `
      function complex(a, b, c) {
        if (a) {
          for (let i = 0; i < b; i++) {
            if (c && a > b) {
              return true;
            }
          }
        } else if (b) {
          switch (c) {
            case 1: return true;
            case 2: return false;
          }
        }
      }
    `;
    // 1(base) + 2(if, else if) + 1(for) + 1(nested if) + 1(&&) + 1(switch) + 2(case) = 9
    const complexity = calculateCyclomaticComplexity(code);
    expect(complexity).toBeGreaterThanOrEqual(8);
  });

  it("should calculate churn score with decay", () => {
    const score = calculateChurnScore(10, 5, 0);
    expect(score).toBe(15);
    
    const decayedScore = calculateChurnScore(10, 5, 30);
    expect(decayedScore).toBeCloseTo(7.5, 1);
  });

  it("should classify a full EnrichedPR into static metrics", () => {
    const mockPR: Partial<EnrichedPR> = {
      diffs: [
        { filename: "src/auth.ts", status: "modified", additions: 20, deletions: 5, patch: "+ if (user) { return auth(); }" },
        { filename: "README.md", status: "modified", additions: 3, deletions: 1, patch: "Updated docs" },
      ],
      astDiffs: [],
    };
    const metrics = analyzeStaticMetrics(mockPR as EnrichedPR);
    expect(metrics.fileMetrics).toHaveLength(2);
    expect(metrics.changeTypeClassification).toHaveLength(2);
    expect(metrics.overallMetrics.totalChurn).toBeGreaterThan(0);
  });
});

// ─── Layer 2: Graph Metrics ──────────────────────────────────────────────
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

  it("should handle a star topology (many importers → one core)", () => {
    const graph: DependencyGraph = {
      nodes: [
        { id: "core/db.ts", label: "db.ts", type: "source", moduleId: "core/db.ts", isEntryPoint: false, language: "typescript" },
        { id: "routes/a.ts", label: "a.ts", type: "source", moduleId: "routes/a.ts", isEntryPoint: false, language: "typescript" },
        { id: "routes/b.ts", label: "b.ts", type: "source", moduleId: "routes/b.ts", isEntryPoint: false, language: "typescript" },
        { id: "routes/c.ts", label: "c.ts", type: "source", moduleId: "routes/c.ts", isEntryPoint: false, language: "typescript" },
      ],
      edges: [
        { source: "routes/a.ts", target: "core/db.ts", type: "import", weight: 1 },
        { source: "routes/b.ts", target: "core/db.ts", type: "import", weight: 1 },
        { source: "routes/c.ts", target: "core/db.ts", type: "import", weight: 1 },
      ],
      preComputedAt: new Date(),
    };

    const metrics = computeGraphMetrics(graph);
    const dbNode = metrics.nodeMetrics.find(m => m.filename === "core/db.ts");
    const routeNode = metrics.nodeMetrics.find(m => m.filename === "routes/a.ts");

    // db.ts should have highest PageRank (most imported)
    expect(dbNode?.pageRank).toBeGreaterThan(routeNode?.pageRank || 0);
    expect(dbNode?.inDegree).toBe(3);
    expect(dbNode?.authorityScore).toBeGreaterThan(0);
  });

  it("should resolve relative paths correctly", () => {
    const nodes = ["src/server/db.ts", "src/server/auth.ts", "src/routes/index.ts"];
    expect(resolvePath("src/routes/index.ts", "../server/db", nodes)).toBe("src/server/db.ts");
    expect(resolvePath("src/server/auth.ts", "./db", nodes)).toBe("src/server/db.ts");
    expect(resolvePath("src/server/auth.ts", "@/lib/utils", nodes)).toBeNull(); // Alias not supported yet
  });
});

// ─── Layer 3: Impact Scoring ─────────────────────────────────────────────
describe("Layer 3: Impact Scoring", () => {
  it("should weight high-PageRank files higher", () => {
    const mockPR: Partial<EnrichedPR> = {
      diffs: [
        { filename: "core/db.ts", status: "modified", additions: 10, deletions: 5, patch: "" },
        { filename: "leaf.ts", status: "modified", additions: 10, deletions: 5, patch: "" },
      ],
      astDiffs: [],
      codeOwnership: [],
    };

    const staticMetrics: StaticMetrics = {
      fileMetrics: [
        { filename: "core/db.ts", churnScore: 15, churnRatio: 0.15, cyclomaticComplexity: 5, halsteadVolume: 100, halsteadDifficulty: 10, linesAdded: 10, linesDeleted: 5, testToCodeRatio: 0 },
        { filename: "leaf.ts", churnScore: 15, churnRatio: 0.15, cyclomaticComplexity: 2, halsteadVolume: 50, halsteadDifficulty: 5, linesAdded: 10, linesDeleted: 5, testToCodeRatio: 0 },
      ],
      overallMetrics: { totalChurn: 30, avgChurnRatio: 0.15, maxChurnScore: 15, avgComplexity: 3.5, totalComplexityDelta: 0 },
      changeTypeClassification: [],
    };

    const graphMetrics = {
      nodeMetrics: [
        { filename: "core/db.ts", pageRank: 0.6, betweennessCentrality: 80, inDegree: 5, outDegree: 1, hubScore: 0.2, authorityScore: 0.9, clusteringCoefficient: 0, communityId: 0, efferentCoupling: 1, afferentCoupling: 5, instability: 0.17, abstractness: 0, distanceFromMainSequence: 0 },
        { filename: "leaf.ts", pageRank: 0.1, betweennessCentrality: 10, inDegree: 0, outDegree: 3, hubScore: 0.8, authorityScore: 0.1, clusteringCoefficient: 0, communityId: 0, efferentCoupling: 3, afferentCoupling: 0, instability: 1, abstractness: 0, distanceFromMainSequence: 0 },
      ],
      globalMetrics: { avgPathLength: 2, diameter: 3, density: 0.1, modularity: 0.5, avgClusteringCoefficient: 0, connectedComponents: 1, cycleCount: 0 },
      structuralChanges: [],
    };

    const profile = computeImpactProfile(mockPR as EnrichedPR, staticMetrics, graphMetrics);
    const dbContrib = profile.perFileContributions.find(c => c.filename === "core/db.ts");
    const leafContrib = profile.perFileContributions.find(c => c.filename === "leaf.ts");

    expect(dbContrib?.archScoreContribution).toBeGreaterThan(leafContrib?.archScoreContribution || 0);
  });
});

// ─── Layer 4: Invisible Work ─────────────────────────────────────────────
describe("Layer 4: Invisible Work Detection", () => {
  it("should detect refactoring from balanced additions/deletions", () => {
    const mockPR: Partial<EnrichedPR> = {
      diffs: [{ filename: "utils.ts", status: "modified", additions: 20, deletions: 18, patch: "refactor: clean up" }],
      astDiffs: [{ filename: "utils.ts", beforeSymbols: [], afterSymbols: [], addedSymbols: [], removedSymbols: [], changedSymbols: [], addedImports: [], removedImports: [], semanticChange: "refactor" }],
    };

    const staticMetrics: StaticMetrics = {
      fileMetrics: [{ filename: "utils.ts", churnScore: 38, churnRatio: 0.38, cyclomaticComplexity: 3, halsteadVolume: 50, halsteadDifficulty: 5, linesAdded: 20, linesDeleted: 18, testToCodeRatio: 0 }],
      overallMetrics: { totalChurn: 38, avgChurnRatio: 0.38, maxChurnScore: 38, avgComplexity: 3, totalComplexityDelta: 0 },
      changeTypeClassification: [],
    };

    const report = analyzeInvisibleWork(mockPR as EnrichedPR, staticMetrics);
    expect(report.categories.length).toBeGreaterThan(0);
    expect(report.categories[0].category).toBe("refactoring");
    expect(report.categories[0].confidence).toBe(0.95); // AST-confirmed refactor gets 0.95
  });

  it("should detect tech debt markers", () => {
    const mockPR: Partial<EnrichedPR> = {
      diffs: [{ filename: "api.ts", status: "modified", additions: 5, deletions: 0, patch: "// TODO: fix this hack later" }],
      astDiffs: [{ filename: "api.ts", beforeSymbols: [], afterSymbols: [], addedSymbols: [], removedSymbols: [], changedSymbols: [], addedImports: [], removedImports: [], semanticChange: "none" }],
    };

    const staticMetrics: StaticMetrics = {
      fileMetrics: [{ filename: "api.ts", churnScore: 5, churnRatio: 0.05, cyclomaticComplexity: 1, halsteadVolume: 10, halsteadDifficulty: 2, linesAdded: 5, linesDeleted: 0, testToCodeRatio: 0 }],
      overallMetrics: { totalChurn: 5, avgChurnRatio: 0.05, maxChurnScore: 5, avgComplexity: 1, totalComplexityDelta: 0 },
      changeTypeClassification: [],
    };

    const report = analyzeInvisibleWork(mockPR as EnrichedPR, staticMetrics);
    const techDebt = report.categories.find(c => c.category === "tech_debt");
    expect(techDebt).toBeDefined();
  });
});

// ─── Layer 6: Semantic Verification (LLM-Powered) ───────────────────────
describe("Layer 6: Semantic Verification", () => {
  it("should verify citations using the mocked LLM", async () => {
    const mockDraft: Partial<NarrativeDraft> = {
      citations: [
        { claim: "Refactored the auth middleware", ref: "src/auth.ts", sha: "abc123", evidenceType: "structural", verified: false },
      ],
    };
    const mockPR: Partial<EnrichedPR> = {
      diffs: [{ filename: "src/auth.ts", status: "modified", additions: 10, deletions: 5, patch: "@@ -1,5 +1,10 @@\n-oldAuth()\n+newRefactoredAuth()" }],
    };

    const result = await runLayer6(
      mockDraft as NarrativeDraft,
      mockPR as EnrichedPR,
      { fileMetrics: [] } as any,
      { perFileContributions: [] } as any
    );

    expect(result.citations[0].verified).toBe(true);
    expect(result.citations[0].verificationDetails).toContain("[Semantic]");
    expect(result.selfConsistencyScore).toBe(1);
  });

  it("should compute self-consistency as ratio of verified citations", () => {
    const draft: Partial<NarrativeDraft> = {
      citations: [
        { claim: "A", ref: "a.ts", sha: "", evidenceType: "metric", verified: true },
        { claim: "B", ref: "b.ts", sha: "", evidenceType: "metric", verified: false },
        { claim: "C", ref: "c.ts", sha: "", evidenceType: "structural", verified: true },
      ],
    };
    expect(computeSelfConsistency(draft as NarrativeDraft)).toBeCloseTo(0.667, 2);
  });

  it("should fall back to file presence when LLM and metrics both fail", async () => {
    // Override the mock for this test to simulate LLM returning unverified
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const instance = new Anthropic();
    (instance.messages.create as any).mockResolvedValueOnce({
      content: [{ type: "text", text: JSON.stringify({ verified: false, reason: "No evidence" }) }],
    });

    const result = await verifyCitations(
      { citations: [{ claim: "Did something", ref: "exists.ts", sha: "", evidenceType: "behavioral", verified: false }] } as any,
      { diffs: [{ filename: "exists.ts", status: "modified", additions: 1, deletions: 0, patch: "// noop" }] } as any,
      { fileMetrics: [] } as any,
      { perFileContributions: [] } as any
    );

    // File exists, so it should fall back to file presence
    expect(result[0].verified).toBe(true);
  });

  it("should handle citations for non-existent files", async () => {
    const result = await verifyCitations(
      { citations: [{ claim: "Changed ghost.ts", ref: "ghost.ts", sha: "", evidenceType: "metric", verified: false }] } as any,
      { diffs: [] } as any,
      { fileMetrics: [] } as any,
      { perFileContributions: [] } as any
    );

    expect(result[0].verified).toBe(false);
    expect(result[0].verificationDetails).toContain("Unable to fully verify");
  });
});

// ─── Smoke Test: Engine Types ────────────────────────────────────────────
describe("Type Safety Smoke Tests", () => {
  it("should construct a valid NarrativeDraft", () => {
    const draft: NarrativeDraft = {
      version: 1,
      linkedinPost1: "Test",
      linkedinPost2: "Test",
      linkedinPost3: "Test",
      resumeBullet: "Test",
      interviewHook: "Test",
      commitMessageSummary: "Test",
      citations: [],
      category: "Feature",
      impactScore: 50,
      complexityLevel: "senior",
      hypeScore: 40,
      selfConsistencyScore: 1,
      evidenceDensityScore: 0.8,
    };
    expect(draft.version).toBe(1);
    expect(draft.complexityLevel).toBe("senior");
  });
});
