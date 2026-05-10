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

async function verifySemanticClaim(claim: string, patch: string): Promise<{ verified: boolean; reason: string; confidence: number }> {
  try {
    // Step 1: Initial Verification
    const response = await anthropic.messages.create({
      model: process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022",
      max_tokens: 300,
      system: "You are a code verification agent. Determine if the technical CLAIM is supported by the provided DIFF PATCH. Respond ONLY in JSON: { \"verified\": boolean, \"reason\": \"string\", \"confidence\": number (0-1) }",
      messages: [{ role: "user", content: `CLAIM: ${claim}\n\nDIFF:\n${patch}` }],
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "{}";
    const initialResult = JSON.parse(content.replace(/^```json\n?/, "").replace(/\n?```$/, ""));

    // Step 2: Self-Correction Loop (The "Adversarial" Check)
    // If the initial result is verified but confidence is not absolute, we ask the LLM to try and disprove it.
    if (initialResult.verified && initialResult.confidence < 0.9) {
      const adversarialResponse = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        system: "You are an adversarial code reviewer. Your goal is to find why the CLAIM might NOT be fully supported by the DIFF. If you find a flaw, explain it. Respond in JSON: { \"flawFound\": boolean, \"explanation\": \"string\" }",
        messages: [{ role: "user", content: `CLAIM: ${claim}\n\nDIFF:\n${patch}` }],
      });
      
      const advContent = adversarialResponse.content[0].type === "text" ? adversarialResponse.content[0].text : "{}";
      const advResult = JSON.parse(advContent.replace(/^```json\n?/, "").replace(/\n?```$/, ""));

      if (advResult.flawFound) {
        return { 
          verified: false, 
          reason: `Adversarial check failed: ${advResult.explanation}`, 
          confidence: 0.95 
        };
      }
    }

    return initialResult;
  } catch (e) {
    return { verified: false, reason: "Semantic engine error or timeout.", confidence: 0 };
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
    let confidence = 0.5;

    // 1. Basic File Existence Check
    const fileExists = enrichedPR.diffs.some(d => d.filename === citation.ref);
    const diff = enrichedPR.diffs.find(d => d.filename === citation.ref);

    // 2. Semantic NLI Check (The Rigorous Upgrade)
    if (diff && citation.claim) {
      const result = await verifySemanticClaim(citation.claim, diff.patch || "");
      if (result.verified) {
        verified = true;
        details = `[Semantic] ${result.reason}`;
        confidence = result.confidence;
      } else {
        details = `[Failed] ${result.reason}`;
        confidence = result.confidence;
      }
    }

    // 3. Fallback: Metric Cross-Reference (with confidence adjustment)
    if (!verified && (citation.evidenceType === 'metric')) {
      const metric = staticMetrics.fileMetrics.find(m => m.filename === citation.ref);
      if (metric) {
        if (citation.claim.toLowerCase().includes("complexity") && metric.cyclomaticComplexity > 1) {
          verified = true;
          details = "Complexity metric confirmed via AST analysis.";
          confidence = 0.8;
        }
      }
    }

    if (!verified && fileExists) {
      // Weak verification
      verified = true;
      details = "File presence verified, but content-level grounding is unverified.";
      confidence = 0.3;
    }

    return {
      ...citation,
      verified,
      verificationDetails: details || "Unable to fully verify claim content.",
      confidenceScore: confidence, // New field for transparency
    };
  }));

  return verifiedCitations;
}

export function computeSelfConsistency(draft: NarrativeDraft): number {
  const verifiedCount = draft.citations.filter(c => c.verified).length;
  const weightedVerified = draft.citations.reduce((acc, c) => acc + (c.verified ? (c.confidenceScore || 0.5) : 0), 0);
  return draft.citations.length > 0 ? weightedVerified / draft.citations.length : 1;
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
