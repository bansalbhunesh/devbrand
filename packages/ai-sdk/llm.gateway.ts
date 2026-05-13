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
  "analysis.layer5.narrative": {
    version: "1.0.0",
    template: (context: string) =>
      `Analyze this technical data and generate a narrative summary:\n\n${context}`,
  },
  "roast.profile": {
    version: "2.1.0",
    template: (username: string, data: string) =>
      `Generate a witty, technical roast for GitHub user ${username} based on this data: ${data}`,
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
