import {
  completeText,
  normalizeLlmJsonText,
  sumUsage,
  ZeroUsage,
  type TokenUsage,
} from "@devbrand/ai-sdk";
import type { NarrativeRequest, NarrativeDraft } from "./types";

let _usage: TokenUsage = { ...ZeroUsage };

export function consumeGeneratorUsage(): TokenUsage {
  const u = _usage;
  _usage = { ...ZeroUsage };
  return u;
}

export async function runLayer5(
  req: NarrativeRequest,
): Promise<NarrativeDraft> {
  const result = await completeText({
    promptKey: "analysis.layer5.narrative",
    variables: [JSON.stringify(req)],
  });

  _usage = sumUsage(_usage, result.usage);

  const parsed = JSON.parse(normalizeLlmJsonText(result.text) || "{}");

  // Basic validation and defaults
  return {
    version: 2,
    linkedinPost1: parsed.linkedinPost1 || "",
    linkedinPost2: parsed.linkedinPost2 || "",
    linkedinPost3: parsed.linkedinPost3 || "",
    twitterThread: parsed.twitterThread || [],
    resumeBullet: parsed.resumeBullet || "",
    interviewHook: parsed.interviewHook || "",
    commitMessageSummary: parsed.commitMessageSummary || "",
    citations: parsed.citations || [],
    category: parsed.category || "Feature",
    impactScore: parsed.impactScore || 50,
    complexityLevel: parsed.complexityLevel || "mid",
    hypeScore: 0.5,
    selfConsistencyScore: 1,
    evidenceDensityScore: 1,
  };
}
