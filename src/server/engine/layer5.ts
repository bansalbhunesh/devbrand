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

async function generateSingleDraft(request: NarrativeRequest, temperature: number) {
  const systemPrompt = `You are an engineering impact analyst for DevBrand.
Generate a narrative based on the 7-layer engine analysis.
CALIBRATION:
- Focus on Evidence: Use metrics like ArchScore (${request.impactProfile.archScore}), Churn, and Dependency changes.
- Seniority: ${request.userContext.seniority} level engineering.
- Tone: ${request.userContext.tone}.
- User Preferences: ${request.userPreferences ? JSON.stringify(request.userPreferences) : 'Standard professional tone'}.
- Keywords: ${request.userPreferences?.frequentKeywords.join(', ') || 'None'}.

OUTPUT:
Return ONLY valid JSON with keys: linkedinPost1, linkedinPost2, linkedinPost3, resumeBullet, interviewHook, commitMessageSummary, citations (array of {claim, ref, sha, evidenceType, verified}).`;

  const userMessage = [
    `PR: ${request.enrichedPR.metadata.title}`,
    `Impact Profile: ${JSON.stringify(request.impactProfile)}`,
    `Invisible Work: ${JSON.stringify(request.invisibleWorkReport)}`,
    `Static Metrics: ${JSON.stringify(request.staticMetrics.overallMetrics)}`,
  ].join("\n");

  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2500,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const rawContent = response.content[0].type === "text" ? response.content[0].text.trim() : "";
      const cleaned = rawContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      return JSON.parse(cleaned);
    } catch (e) {
      attempts++;
      if (attempts >= 3) throw e;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
    }
  }
}

export async function generateNarrative(request: NarrativeRequest): Promise<NarrativeDraft> {
  // Generate 3 drafts in parallel for self-consistency voting
  const drafts = await Promise.all([
    generateSingleDraft(request, 0.6),
    generateSingleDraft(request, 0.8),
    generateSingleDraft(request, 0.9),
  ]);

  // Use Claude as Judge to evaluate consistency and pick the best draft
  const judgePrompt = `You are the Lead Technical Editor for DevBrand.
Review these 3 draft narratives for a ${request.userContext.seniority} engineer.
Evaluate them for factual consistency, professional tone, and impact.
Return ONLY valid JSON with exactly these keys:
{
  "bestDraftIndex": 0, // or 1 or 2
  "consistencyScore": 90 // 0-100, high if all drafts made similar claims, low if they contradicted
}`;

  const judgeMessage = drafts.map((d, i) => `Draft ${i}:\n${JSON.stringify(d)}`).join("\n\n");

  let judgeOutput = { bestDraftIndex: 0, consistencyScore: 80 };
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 0,
      system: judgePrompt,
      messages: [{ role: "user", content: judgeMessage }],
    });
    const rawContent = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const cleaned = rawContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    judgeOutput = JSON.parse(cleaned);
  } catch (e) {
    console.warn("[Layer 5] Judge failed, falling back to draft 0", e);
  }

  const bestDraft = drafts[judgeOutput.bestDraftIndex] || drafts[0];

  // Calculate hype score based on impact profile and invisible work
  const rawHype = (request.impactProfile.archScore * 0.7) + (request.invisibleWorkReport.invisibleWorkScore * 0.3);
  const hypeScore = Math.min(100, Math.round(rawHype));

  return {
    version: 1,
    linkedinPost1: bestDraft.linkedinPost1 || "",
    linkedinPost2: bestDraft.linkedinPost2 || "",
    linkedinPost3: bestDraft.linkedinPost3 || "",
    resumeBullet: bestDraft.resumeBullet || "",
    interviewHook: bestDraft.interviewHook || "",
    commitMessageSummary: bestDraft.commitMessageSummary || "",
    citations: bestDraft.citations || [],
    category: request.staticMetrics.changeTypeClassification[0]?.type || "Feature",
    impactScore: request.impactProfile.archScore,
    complexityLevel: request.userContext.seniority,
    hypeScore,
    selfConsistencyScore: judgeOutput.consistencyScore || 85,
    evidenceDensityScore: 0, // Will be set by Layer 6
  };
}
