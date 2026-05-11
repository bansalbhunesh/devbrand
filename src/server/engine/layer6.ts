import { completeText, normalizeLlmJsonText } from "../llm/client";
import type {
  NarrativeDraft,
  EnrichedPR,
  StaticMetrics,
  ImpactProfile,
  Citation,
} from "./types";

function normalizeSemanticResult(parsed: Record<string, unknown>): {
  verified: boolean;
  reason: string;
  confidence: number;
} {
  const verified = Boolean(parsed.verified);
  const reason = typeof parsed.reason === "string" ? parsed.reason : "";
  const raw = parsed.confidence;
  const confidence =
    typeof raw === "number" && !Number.isNaN(raw)
      ? Math.min(1, Math.max(0, raw))
      : verified
        ? 1
        : 0;
  return { verified, reason, confidence };
}

async function verifySemanticClaim(claim: string, patch: string): Promise<{ verified: boolean; reason: string; confidence: number }> {
  try {
    // Step 1: Initial Verification
    const verifySystem =
      'You are a code verification agent. Determine if the technical CLAIM is supported by the provided DIFF PATCH. Respond ONLY in JSON: { "verified": boolean, "reason": "string", "confidence": number (0-1) }';
    const content = await completeText({
      system: verifySystem,
      user: `CLAIM: ${claim}\n\nDIFF:\n${patch}`,
      maxTokens: 300,
      temperature: 0,
    });
    const initialResult = normalizeSemanticResult(JSON.parse(normalizeLlmJsonText(content) || "{}"));

    // Step 2: Self-Correction Loop (The "Adversarial" Check)
    // If the initial result is verified but confidence is not absolute, we ask the LLM to try and disprove it.
    if (initialResult.verified && initialResult.confidence < 0.9) {
      const advSystem =
        'You are an adversarial code reviewer. Your goal is to find why the CLAIM might NOT be fully supported by the DIFF. If you find a flaw, explain it. Respond in JSON: { "flawFound": boolean, "explanation": "string" }';
      const advRaw = await completeText({
        system: advSystem,
        user: `CLAIM: ${claim}\n\nDIFF:\n${patch}`,
        maxTokens: 300,
        temperature: 0,
      });
      const advResult = JSON.parse(normalizeLlmJsonText(advRaw) || "{}");

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

function weightCitationConfidence(c: Citation): number {
  if (!c.verified) return 0;
  const s = c.confidenceScore;
  if (typeof s === "number" && !Number.isNaN(s)) return Math.min(1, Math.max(0, s));
  return 1;
}

export async function verifyCitations(
  draft: NarrativeDraft,
  enrichedPR: EnrichedPR,
  staticMetrics: StaticMetrics,
  _impactProfile: ImpactProfile
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
  const weightedVerified = draft.citations.reduce((acc, c) => acc + weightCitationConfidence(c), 0);
  return draft.citations.length > 0 ? weightedVerified / draft.citations.length : 1;
}

export async function runLayer6(
  draft: NarrativeDraft,
  enrichedPR: EnrichedPR,
  staticMetrics: StaticMetrics,
  _impactProfile: ImpactProfile
): Promise<NarrativeDraft> {
  const verifiedCitations = await verifyCitations(draft, enrichedPR, staticMetrics, _impactProfile);
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
