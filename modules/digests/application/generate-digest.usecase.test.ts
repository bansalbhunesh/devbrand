import { describe, it, expect } from "vitest";

// Mock data structures to match the new usecase architecture
const CATEGORY_BOOST: Record<string, number> = {
  architecture: 35,
  feature: 15,
  performance: 10,
  infra: 10,
  chore: -15,
  docs: -20,
};

const BUCKET_MAP: Record<string, string | null> = {
  architecture: "Core Architecture",
  refactor: "Core Architecture",
  database: "Reliability & Infra",
  infra: "Reliability & Infra",
  monitoring: "Reliability & Infra",
  feature: "Product Features",
  api: "Product Features",
  ui: "Product Features",
  performance: "Tech Debt & Polish",
  test: "Tech Debt & Polish",
  config: "Tech Debt & Polish",
  docs: null,
  chore: null,
};

function computeImpactScore(pr: any): number {
  const baseScore = pr.impactScore || 30; // fallback if missing
  const catBoost = CATEGORY_BOOST[pr.category] ?? 0;
  return Math.round(baseScore + catBoost);
}

function buildStructuredPayload(deduped: any[]) {
  const buckets = new Map<
    string,
    Array<{ title: string; score: number; author: string; id: string }>
  >();

  for (const pr of deduped) {
    const bucketName = BUCKET_MAP[pr.category] ?? null;
    if (!bucketName) continue; // Drop docs, chores, and unmapped

    const finalScore = computeImpactScore(pr);

    // Drop low-impact config/tech-debt unless it's the only thing they did
    if (bucketName === "Tech Debt & Polish" && finalScore < 40 && deduped.length > 2) {
      continue;
    }

    if (!buckets.has(bucketName)) buckets.set(bucketName, []);
    buckets.get(bucketName)!.push({
      id: pr.id || Math.random().toString(),
      title: pr.title,
      score: finalScore,
      author: "user",
    });
  }

  const rankedBuckets = Array.from(buckets.entries())
    .map(([name, prs]) => {
      prs.sort((a, b) => b.score - a.score);
      const totalScore = prs.reduce((sum, p) => sum + p.score, 0);
      return { name, totalScore, prs };
    })
    .sort((a, b) => b.totalScore - a.totalScore);

  return {
    buckets: rankedBuckets.map((b) => ({
      name: b.name,
      totalScore: b.totalScore,
      prs: b.prs.slice(0, 3).map((pr) => ({ title: pr.title, score: pr.score })),
    })),
    alsoShipped: rankedBuckets.flatMap((b) => b.prs.slice(3).map((p) => p.title)),
  };
}

describe("Structured Context Engine Pipeline", () => {
  it("strips low-impact config PRs before LLM call", () => {
    const fixture = [
      { category: "config", impactScore: 25, title: "Bump eslint version" }, // Final score: 25 + 0 = 25 (< 40)
      { category: "feature", impactScore: 80, title: "Add webhook retry logic" },
      { category: "feature", impactScore: 70, title: "Fix UI layout" }, // To trigger deduped.length > 2
    ];
    
    const payload = buildStructuredPayload(fixture);
    const prTitles = payload.buckets.flatMap((b) => b.prs).map((p) => p.title);
    
    expect(prTitles).not.toContain("Bump eslint version");
    expect(prTitles).toContain("Add webhook retry logic");
  });

  it("never forwards docs PRs", () => {
    const fixture = [
      { category: "docs", impactScore: 90, title: "Rewrite README" },
      { category: "feature", impactScore: 80, title: "Add webhook retry logic" },
    ];
    
    const payload = buildStructuredPayload(fixture);
    const prTitles = payload.buckets.flatMap((b) => b.prs).map((p) => p.title);
    
    expect(prTitles).not.toContain("Rewrite README");
  });

  it("caps at 3 PRs per bucket and puts the rest in alsoShipped", () => {
    const fixture = [
      { category: "feature", impactScore: 90, title: "Feature 1" },
      { category: "feature", impactScore: 85, title: "Feature 2" },
      { category: "feature", impactScore: 80, title: "Feature 3" },
      { category: "feature", impactScore: 75, title: "Feature 4" },
      { category: "feature", impactScore: 70, title: "Feature 5" },
    ];
    
    const payload = buildStructuredPayload(fixture);
    
    const featureBucket = payload.buckets.find(b => b.name === "Product Features");
    expect(featureBucket?.prs.length).toBe(3);
    
    expect(payload.alsoShipped).toContain("Feature 4");
    expect(payload.alsoShipped).toContain("Feature 5");
  });
});
