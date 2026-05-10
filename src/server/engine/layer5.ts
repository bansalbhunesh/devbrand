import Anthropic from "@anthropic-ai/sdk";
import type {
  NarrativeRequest,
  NarrativeDraft,
  Citation,
} from "./types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022";

export async function generateNarrative(request: NarrativeRequest): Promise<NarrativeDraft> {
  const systemPrompt = `You are an engineering impact analyst for DevBrand.
Generate a narrative based on the 7-layer engine analysis.
CALIBRATION:
- Focus on Evidence: Use metrics like ArchScore (${request.impactProfile.archScore}), Churn, and Dependency changes.
- Seniority: ${request.userContext.seniority} level engineering.
- Tone: ${request.userContext.tone}.

OUTPUT:
Return ONLY valid JSON with keys: linkedinPost1, linkedinPost2, linkedinPost3, resumeBullet, interviewHook, commitMessageSummary, citations (array of {claim, ref, sha, evidenceType, verified}).`;

  const userMessage = [
    `PR: ${request.enrichedPR.metadata.title}`,
    `Impact Profile: ${JSON.stringify(request.impactProfile)}`,
    `Invisible Work: ${JSON.stringify(request.invisibleWorkReport)}`,
    `Static Metrics: ${JSON.stringify(request.staticMetrics.overallMetrics)}`,
  ].join("\n");

  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  while (attempts < MAX_ATTEMPTS) {
    try {
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2500,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const rawContent = response.content[0].type === "text" ? response.content[0].text.trim() : "";
      const cleaned = rawContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      const output = JSON.parse(cleaned);

      return {
        version: 1,
        linkedinPost1: output.linkedinPost1,
        linkedinPost2: output.linkedinPost2,
        linkedinPost3: output.linkedinPost3,
        resumeBullet: output.resumeBullet,
        interviewHook: output.interviewHook,
        commitMessageSummary: output.commitMessageSummary,
        citations: output.citations,
        category: request.staticMetrics.changeTypeClassification[0]?.type || "Feature",
        impactScore: request.impactProfile.archScore,
        complexityLevel: request.userContext.seniority,
        hypeScore: 0,
        selfConsistencyScore: 1,
        evidenceDensityScore: 1,
      };
    } catch (e) {
      attempts++;
      if (attempts >= MAX_ATTEMPTS) throw e;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
    }
  }
  throw new Error("GENERATION_FAILED");
}

