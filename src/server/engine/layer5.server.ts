import {
  completeText,
  normalizeLlmJsonText,
  sumUsage,
  ZeroUsage,
  type TokenUsage,
} from "../llm/client";
import type { NarrativeRequest, NarrativeDraft } from "./types";

let _layer5Usage: TokenUsage = { ...ZeroUsage };

export function consumeLayer5Usage(): TokenUsage {
  const u = _layer5Usage;
  _layer5Usage = { ...ZeroUsage };
  return u;
}

async function generateSingleDraft(
  request: NarrativeRequest,
  temperature: number,
) {
  // Voice examples are prepended verbatim so the model anchors on the user's
  // own phrasing — diff-style instructions ("write like X") underperform
  // exemplar conditioning at this prompt size.
  const voiceBlock =
    request.voiceExamples && request.voiceExamples.length > 0
      ? `\n\nVOICE CALIBRATION — The user has edited their own posts before. Match this voice (cadence, vocabulary, formatting). Do NOT copy phrases verbatim.\n${request.voiceExamples
          .map(
            (ex, i) =>
              `Example ${i + 1} (${ex.postKind}):\n"""\n${ex.editedText}\n"""`,
          )
          .join("\n\n")}`
      : "";

  const systemPrompt = `You are an elite Engineering Branding Specialist. Your job is to transform technical PR data into high-impact narratives for LinkedIn and Twitter/X.

CALIBRATION:
- Engineer Seniority: ${request.userContext.seniority}
- Core Impact: ArchScore ${request.impactProfile.archScore}/100
- Tone: ${request.userContext.tone}
- User Interests: ${request.userPreferences?.frequentKeywords.join(", ") || "General Engineering"}

CONTENT GUIDELINES:
- linkedinPost1 (THE ARCHITECT): Focus on system design, trade-offs, and "The Big Picture." Use a professional, thought-leadership tone.
- linkedinPost2 (THE BUILDER): Focus on the "In the trenches" technical challenges. Mention specific churn, complexity, and refactoring effort.
- linkedinPost3 (THE VIRAL HOOK): Short, punchy, and bold. 3-5 sentences max. Use "I did X so you don't have to" or "Why Y matters" style.
- twitterThread: An array of 4-7 tweets, each STRICTLY <= 280 characters. Structure: tweet 1 is the HOOK (a bold claim or question), tweets 2-3 SETUP (context, why it mattered), middle tweets the MEAT (technical specifics, numbers, decisions), final tweet the KICKER (takeaway or punchline). No tweet numbering — the array order implies sequence. No threadjacking, no generic CTAs.
- resumeBullet: A single, action-oriented bullet point using the [Action] + [Context] + [Result/Metric] formula.
- interviewHook: A 2-sentence story starter for "Tell me about a time you solved a complex problem."

STRICT FORMATTING:
- Use bullet points where appropriate.
- Avoid excessive emojis (max 2 per post).
- Return ONLY valid JSON matching the schema. No markdown.${voiceBlock}`;

  const userMessage = [
    `PR: ${request.enrichedPR.metadata.title}`,
    `Impact Profile: ${JSON.stringify(request.impactProfile)}`,
    `Invisible Work: ${JSON.stringify(request.invisibleWorkReport)}`,
    `Static Metrics: ${JSON.stringify(request.staticMetrics.overallMetrics)}`,
  ].join("\n");

  let attempts = 0;
  while (attempts < 3) {
    try {
      const result = await completeText({
        system: systemPrompt,
        user: userMessage,
        maxTokens: 2500,
        temperature,
        cacheSystem: true,
      });
      _layer5Usage = sumUsage([_layer5Usage, result.usage]);
      const cleaned = normalizeLlmJsonText(result.text);
      return JSON.parse(cleaned);
    } catch (e) {
      attempts++;
      if (attempts >= 3) throw e;
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempts) * 1000),
      );
    }
  }
}

function coerceTwitterThread(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    .map((t) => t.slice(0, 280));
}

export async function generateNarrative(
  request: NarrativeRequest,
): Promise<NarrativeDraft> {
  const bestDraft = await generateSingleDraft(request, 0.7);

  const rawHype =
    request.impactProfile.archScore * 0.7 +
    request.invisibleWorkReport.invisibleWorkScore * 0.3;
  const hypeScore = Math.min(100, Math.round(rawHype));

  return {
    version: 1,
    linkedinPost1: bestDraft.linkedinPost1 || "",
    linkedinPost2: bestDraft.linkedinPost2 || "",
    linkedinPost3: bestDraft.linkedinPost3 || "",
    twitterThread: coerceTwitterThread(bestDraft.twitterThread),
    resumeBullet: bestDraft.resumeBullet || "",
    interviewHook: bestDraft.interviewHook || "",
    commitMessageSummary: bestDraft.commitMessageSummary || "",
    citations: bestDraft.citations || [],
    category:
      request.staticMetrics.changeTypeClassification[0]?.type || "Feature",
    impactScore: request.impactProfile.archScore,
    complexityLevel: request.userContext.seniority,
    hypeScore,
    selfConsistencyScore: 100,
    evidenceDensityScore: 0,
  };
}
