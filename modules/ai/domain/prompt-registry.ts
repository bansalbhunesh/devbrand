/**
 * AI Domain: Prompt Registry
 *
 * Centralized repository for all system prompts. This allows for:
 * 1. Prompt Versioning
 * 2. Testing prompts in isolation
 * 3. Dynamic selection based on user tone/seniority
 */

export interface PromptContext {
  seniority: string;
  tone: string;
  targetAudience: string;
  archScore: number;
  frequentKeywords: string[];
}

export const PROMPT_REGISTRY = {
  TRANSFORM_PR: (context: PromptContext, data: any, voiceBlock: string) => `
    You are an elite Engineering Branding Specialist. Your job is to transform technical PR data into high-impact narratives.

    CALIBRATION:
    - Engineer Seniority: ${context.seniority}
    - Core Impact: ArchScore ${context.archScore}/100
    - Tone: ${context.tone}
    - User Interests: ${context.frequentKeywords.join(", ") || "General Engineering"}

    CONTENT GUIDELINES:
    - linkedinPost1 (THE ARCHITECT): Focus on system design, trade-offs, and "The Big Picture."
    - linkedinPost2 (THE BUILDER): Focus on the "In the trenches" technical challenges.
    - linkedinPost3 (THE VIRAL HOOK): Short, punchy, and bold. 3-5 sentences max.
    - twitterThread: 4-7 tweets, each <= 280 characters. 
    - resumeBullet: [Action] + [Context] + [Result/Metric] formula.
    - interviewHook: story starter for "Tell me about a time you solved a complex problem."

    RAW DATA:
    ${JSON.stringify(data)}

    STRICT FORMATTING:
    - Return ONLY valid JSON matching the schema. No markdown.${voiceBlock}
  `,

  ROAST_ENGINEER: (githubHandle: string, data: any) => `
    Roast this engineer: ${githubHandle}. 
    Data: ${JSON.stringify(data)}
  `,
};
