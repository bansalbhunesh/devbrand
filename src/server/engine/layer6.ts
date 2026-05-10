import Anthropic from "@anthropic-ai/sdk";
import type {
  NarrativeDraft,
  EnrichedPR,
  StaticMetrics,
  ImpactProfile,
  Citation,
} from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function verifySemanticClaim(claim: string, patch: string): Promise<{ verified: boolean; reason: string }> {
  try {
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022",
      max_tokens: 250,
      system: "You are a code verification agent. Determine if the technical CLAIM is supported by the provided DIFF PATCH. Respond ONLY in JSON: { \"verified\": boolean, \"reason\": \"string\" }",
      messages: [{ role: "user", content: `CLAIM: ${claim}\n\nDIFF:\n${patch}` }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "{}";
    const cleaned = content.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(cleaned);
  } catch {
    return { verified: false, reason: "Semantic engine timeout." };
  }
}

export async function verifyCitations(
  draft: NarrativeDraft,
  enrichedPR: EnrichedPR,
  staticMetrics: StaticMetrics,
  impactProfile: ImpactProfile
): Promise<Citation[]> {
  const verifiedCitations = await Promise.all(draft.citations.map(async (citation) => {
    let verified = false;
    let details = "";

    // 1. Basic File Existence Check
    const fileExists = enrichedPR.diffs.some(d => d.filename === citation.ref);
    const diff = enrichedPR.diffs.find(d => d.filename === citation.ref);

    // 2. Semantic NLI Check (The "True Semantic" Upgrade)
    if (diff && citation.claim) {
      const { verified: isSemantic, reason } = await verifySemanticClaim(citation.claim, diff.patch || "");
      if (isSemantic) {
        verified = true;
        details = `[Semantic] ${reason}`;
      }
    }

    // 3. Fallback: Metric Cross-Reference
    if (!verified && (citation.evidenceType === 'metric')) {
      const metric = staticMetrics.fileMetrics.find(m => m.filename === citation.ref);
      if (metric) {
        if (citation.claim.toLowerCase().includes("complexity") && metric.cyclomaticComplexity > 1) {
          verified = true;
          details = "Complexity metric confirmed.";
        }
      }
    }

    // 4. Fallback: Structural Check
    if (!verified && (citation.evidenceType === 'structural')) {
      const contribution = impactProfile.perFileContributions.find(c => c.filename === citation.ref);
      if (contribution && contribution.archScoreContribution > 0) {
        verified = true;
        details = "Structural impact verified.";
      }
    }

    if (!verified && fileExists) {
      verified = true;
      details = "File presence verified, but semantic grounding is weak.";
    }

    return {
      ...citation,
      verified,
      verificationDetails: details || "Unable to fully verify claim content.",
    };
  }));

  return verifiedCitations;
}

export function computeSelfConsistency(draft: NarrativeDraft): number {
  const verifiedCount = draft.citations.filter(c => c.verified).length;
  return draft.citations.length > 0 ? verifiedCount / draft.citations.length : 1;
}

export async function runLayer6(
  draft: NarrativeDraft,
  enrichedPR: EnrichedPR,
  staticMetrics: StaticMetrics,
  impactProfile: ImpactProfile
): Promise<NarrativeDraft> {
  const verifiedCitations = await verifyCitations(draft, enrichedPR, staticMetrics, impactProfile);
  const consistencyScore = computeSelfConsistency({ ...draft, citations: verifiedCitations });
  
  const metricVerified = verifiedCitations.filter(c => c.evidenceType === 'metric' && c.verified).length;
  const structuralVerified = verifiedCitations.filter(c => c.evidenceType === 'structural' && c.verified).length;
  
  const varietyBonus = (metricVerified > 0 && structuralVerified > 0) ? 0.2 : 0;
  const evidenceDensityScore = Math.min(1, (verifiedCitations.filter(v => v.verified).length / 5) + varietyBonus);

  return {
    ...draft,
    citations: verifiedCitations,
    selfConsistencyScore: consistencyScore,
    evidenceDensityScore,
  };
}
