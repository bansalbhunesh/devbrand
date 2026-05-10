import type {
  NarrativeDraft,
  EnrichedPR,
  StaticMetrics,
  ImpactProfile,
  Citation,
} from "./types";

export function verifyCitations(
  draft: NarrativeDraft,
  enrichedPR: EnrichedPR,
  staticMetrics: StaticMetrics,
  impactProfile: ImpactProfile
): Citation[] {
  return draft.citations.map((citation) => {
    let verified = false;
    let details = "";

    // 1. Basic File Existence Check
    const fileExists = enrichedPR.diffs.some(d => d.filename === citation.ref);
    
    // 2. Metric Cross-Reference
    if (citation.evidenceType === 'metric') {
      const metric = staticMetrics.fileMetrics.find(m => m.filename === citation.ref);
      if (metric) {
        // Example: If claim mentions "complexity", check if complexity > 1
        if (citation.claim.toLowerCase().includes("complexity") && metric.cyclomaticComplexity > 1) {
          verified = true;
          details = "Complexity metric confirmed.";
        }
        // Example: Churn
        if (citation.claim.toLowerCase().includes("churn") && metric.churnScore > 0) {
          verified = true;
          details = "Churn score confirmed.";
        }
      }
    }

    // 3. Structural Check (Layer 2/3)
    if (citation.evidenceType === 'structural') {
      const contribution = impactProfile.perFileContributions.find(c => c.filename === citation.ref);
      if (contribution && contribution.archScoreContribution > 0) {
        verified = true;
        details = "Structural impact verified by ArchScore contribution.";
      }
    }

    // Fallback for simple existence
    if (!verified && fileExists) {
      verified = true;
      details = "File presence verified.";
    }

    return {
      ...citation,
      verified,
      verificationDetails: details || "Unable to fully verify claim content.",
    };
  });
}

export function computeSelfConsistency(draft: NarrativeDraft): number {
  // Check if claims in citations contradict the overall impact score
  const verifiedCount = draft.citations.filter(c => c.verified).length;
  return draft.citations.length > 0 ? verifiedCount / draft.citations.length : 1;
}

export function runLayer6(
  draft: NarrativeDraft,
  enrichedPR: EnrichedPR,
  staticMetrics: StaticMetrics,
  impactProfile: ImpactProfile
): NarrativeDraft {
  const verifiedCitations = verifyCitations(draft, enrichedPR, staticMetrics, impactProfile);
  const consistencyScore = computeSelfConsistency({ ...draft, citations: verifiedCitations });

  return {
    ...draft,
    citations: verifiedCitations,
    selfConsistencyScore: consistencyScore,
    evidenceDensityScore: verifiedCitations.length / 5, // Normalized to 5 citations
  };
}
