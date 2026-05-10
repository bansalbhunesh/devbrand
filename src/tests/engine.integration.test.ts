import { describe, it, expect, vi } from "vitest";
import { runEngine } from "../server/engine";
import { ingestAndPreprocessPR } from "../server/engine/layer0";
import { analyzeStaticMetrics } from "../server/engine/layer1";
import { analyzeDependencyGraph } from "../server/engine/layer2";
import { computeImpactProfile } from "../server/engine/layer3";
import { analyzeInvisibleWork } from "../server/engine/layer4";
import { generateNarrative } from "../server/engine/layer5";
import { runLayer6 } from "../server/engine/layer6";
import { runLayer7 } from "../server/engine/layer7";

// Mocking all external dependencies
vi.mock("../server/engine/layer0");
vi.mock("../server/engine/layer5");
vi.mock("../server/engine/layer7");

describe("Engine Integration Test", () => {
  it("should run the full 7-layer pipeline and return a verified narrative", async () => {
    // 1. Mock Layer 0 Ingestion
    (ingestAndPreprocessPR as any).mockResolvedValue({
      metadata: { owner: "test", repo: "repo", prNumber: 1, title: "Refactor Auth" },
      diffs: [
        { filename: "src/auth.ts", patch: "+ export function login() { ... }", additions: 10, deletions: 0 },
        { filename: "src/utils.ts", patch: "+ export function util() { ... }", additions: 5, deletions: 0 }
      ],
      history: { commits: [], linkedIssues: [] }
    });

    // 2. Mock Layer 5 LLM Generation
    (generateNarrative as any).mockResolvedValue({
      linkedinPost1: "Just refactored the auth layer!",
      citations: [
        { claim: "Refactored the authentication logic", ref: "src/auth.ts", evidenceType: "structural" },
        { claim: "Increased complexity in utils", ref: "src/utils.ts", evidenceType: "metric" }
      ],
      impactScore: 85
    });

    // 3. Mock Layer 7 Feedback
    (runLayer7 as any).mockImplementation((userId, draft) => Promise.resolve(draft));

    const result = await runEngine("https://github.com/test/repo/pull/1", "user-123", {
      seniority: "Senior",
      tone: "Professional"
    });

    // Verify Pipeline Connections
    expect(result.impactScore).toBeGreaterThan(0);
    expect(result.citations).toHaveLength(2);
    
    // Verify Layer 6 Verification Logic (Integration with Layer 1, 2, 3)
    // src/auth.ts should be verified structurally because it exists and runEngine logic connects them
    expect(result.citations[0].verified).toBe(true);
    expect(result.citations[0].verificationDetails).toContain("verified");
  });

  it("should handle semantic entailment verification", async () => {
     const mockDraft = {
       citations: [
         { claim: "Refactored login system", ref: "src/auth.ts", evidenceType: "metric" }
       ]
     };
     const mockPR = {
       diffs: [{ filename: "src/auth.ts", patch: "@@ -1,1 +1,1 @@\n-login()\n+new_login_system()" }]
     };
     
     // Direct test of runLayer6 with semantic data
     const verified = runLayer6(mockDraft as any, mockPR as any, { fileMetrics: [] } as any, { perFileContributions: [] } as any);
     
     expect(verified.citations[0].verified).toBe(true);
     expect(verified.citations[0].verificationDetails).toContain("Semantic overlap");
  });
});
