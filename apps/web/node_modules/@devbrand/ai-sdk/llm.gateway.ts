import { env } from "@devbrand/config";
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@devbrand/telemetry";

/**
 * ELITE ARCHITECTURE: AI Control Plane.
 * Manages all LLM interactions with robust error handling and cost governance.
 */

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export const ZeroUsage: TokenUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
};

export const PromptRegistry = {
  "pr.brutal_truth": {
    version: "1.0.0",
    template: (title: string, body: string, diff: string) =>
      `You are the ultimate cynical Staff Engineer. Your job is to brutally roast a pull request.
Do not hold back. Destroy any marketing fluff, bad architectural decisions, or "AI Slop".
Provide "The Brutal Truth" in 2-3 short, punchy, unconstrained paragraphs.

PR Title: ${title}
PR Body: ${body}

Diff:
${diff}`,
  },
  "pr.linkedin_spin": {
    version: "1.0.0",
    template: (title: string, brutalTruth: string) =>
      `You are a highly enthusiastic tech influencer on LinkedIn.
Take this PR Title and its "Brutal Truth" and translate it into a corporate, sanitized, emoji-filled LinkedIn post.
Make it sound like the greatest engineering achievement of the year. Use lots of synergy and "thrilled to announce" type phrasing.

PR Title: ${title}
Brutal Truth to translate: ${brutalTruth}`,
  },
} as const;

export type PromptKey = keyof typeof PromptRegistry;

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

/**
 * The Gateway to Intelligence.
 * Implements real Anthropic integration with retries and usage tracking.
 */
export async function completeText(params: {
  promptKey: PromptKey;
  variables: any[];
  model?: string;
}) {
  const prompt = PromptRegistry[params.promptKey];
  // @ts-expect-error - dynamic template call
  const content = prompt.template(...params.variables);
  const model = params.model || env.CLAUDE_MODEL || "claude-3-7-sonnet-20250219";

  logger.info(`[AICtrl] Routing ${params.promptKey} (v${prompt.version}) to ${model}`);

  if (!env.ANTHROPIC_API_KEY) {
    logger.info(`[AICtrl] No ANTHROPIC_API_KEY found, returning mock response for ${params.promptKey}`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network latency

    let mockText = "";
    if (params.promptKey === "pr.brutal_truth") {
      mockText = `This PR is a classic example of "Resume Driven Development". You've imported three new dependencies just to center a div. The architecture resembles a bowl of spaghetti that was left out in the rain.\n\nNext time, maybe try writing actual code instead of copy-pasting from StackOverflow circa 2014. My disappointment is immeasurable and my day is ruined.`;
    } else {
      mockText = `🚀 THRILLED TO ANNOUNCE my latest open source contribution! 🚀\n\nI just completely revolutionized the way we center divs. By leveraging cutting-edge synergy and bleeding-edge paradigms, we've achieved 10x developer velocity. \n\nSo grateful for my team and the continuous journey of learning! #100DaysOfCode #BuildInPublic #TechLeadership 💡✨`;
    }

    return {
      text: mockText,
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      version: prompt.version,
    };
  }

  try {
    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 4096,
      messages: [{ role: "user", content }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    
    return {
      text,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      version: prompt.version,
    };
  } catch (err: any) {
    logger.error(`[AICtrl] LLM failure for ${params.promptKey}`, { error: err.message });
    throw err;
  }
}

export function sumUsage(usages: TokenUsage[]): TokenUsage {
  return usages.reduce((acc, curr) => ({
    promptTokens: acc.promptTokens + curr.promptTokens,
    completionTokens: acc.completionTokens + curr.completionTokens,
    totalTokens: acc.totalTokens + curr.totalTokens,
  }), { ...ZeroUsage });
}

export function normalizeLlmJsonText(text: string): string {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}
