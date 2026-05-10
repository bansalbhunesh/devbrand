import { completeText, normalizeLlmJsonText } from "../llm/client";
import type {
  NarrativeRequest,
  NarrativeDraft,
  Citation,
} from "./types";

async function generateSingleDraft(request: NarrativeRequest, temperature: number) {
  const systemPrompt = `You are an elite Engineering Branding Specialist. Your job is to transform technical PR data into high-impact narratives for LinkedIn.

CALIBRATION:
- Engineer Seniority: ${request.userContext.seniority}
- Core Impact: ArchScore ${request.impactProfile.archScore}/100
- Tone: ${request.userContext.tone}
- User Interests: ${request.userPreferences?.frequentKeywords.join(', ') || 'General Engineering'}

CONTENT GUIDELINES:
- linkedinPost1 (THE ARCHITECT): Focus on system design, trade-offs, and "The Big Picture." Use a professional, thought-leadership tone.
- linkedinPost2 (THE BUILDER): Focus on the "In the trenches" technical challenges. Mention specific churn, complexity, and refactoring effort.
- linkedinPost3 (THE VIRAL HOOK): Short, punchy, and bold. 3-5 sentences max. Use "I did X so you don't have to" or "Why Y matters" style.
- resumeBullet: A single, action-oriented bullet point using the [Action] + [Context] + [Result/Metric] formula.
- interviewHook: A 2-sentence story starter for "Tell me about a time you solved a complex problem."

STRICT FORMATTING:
- Use bullet points where appropriate.
- Avoid excessive emojis (max 2 per post).
- Return ONLY valid JSON matching the schema. No markdown.`;

  const userMessage = [
    `PR: ${request.enrichedPR.metadata.title}`,
    `Impact Profile: ${JSON.stringify(request.impactProfile)}`,
    `Invisible Work: ${JSON.stringify(request.invisibleWorkReport)}`,
    `Static Metrics: ${JSON.stringify(request.staticMetrics.overallMetrics)}`,
  ].join("\n");

  let attempts = 0;
  while (attempts < 3) {
    try {
      const rawContent = await completeText({
        system: systemPrompt,
        user: userMessage,
        maxTokens: 2500,
        temperature,
      });
      const cleaned = normalizeLlmJsonText(rawContent);
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
    const rawContent = await completeText({
      system: judgePrompt,
      user: judgeMessage,
      maxTokens: 500,
      temperature: 0,
    });
    const cleaned = normalizeLlmJsonText(rawContent);
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
