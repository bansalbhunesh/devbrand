import { env } from "@devbrand/config";

/**
 * ELITE ARCHITECTURE: AI Control Plane.
 * This package manages all LLM interactions, providing routing, versioned prompts,
 * and cost/usage governance.
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

/**
 * Versioned Prompt Registry.
 * Prevents "magic strings" in domain logic.
 */
export const PromptRegistry = {
  "analysis.layer5.narrative": {
    version: "1.0.0",
    template: (context: string) => `Analyze this technical data and generate a narrative summary:\n\n${context}`,
  },
  "roast.profile": {
    version: "2.1.0",
    template: (username: string, data: string) => `Generate a witty, technical roast for GitHub user ${username} based on this data: ${data}`,
  },
} as const;

export type PromptKey = keyof typeof PromptRegistry;

/**
 * The Gateway to Intelligence.
 */
export async function completeText(params: {
  promptKey: PromptKey;
  variables: any[];
  model?: string;
}) {
  const prompt = PromptRegistry[params.promptKey];
  // @ts-ignore - dynamic template call
  const content = prompt.template(...params.variables);

  console.log(`[AICtrl] Routing request for ${params.promptKey} (v${prompt.version})`);

  // Mock implementation of the actual provider call
  // In production, this would call Anthropic or OpenAI
  return {
    text: `[AI Output for ${params.promptKey}]`,
    usage: { ...ZeroUsage },
    version: prompt.version,
  };
}

export function sumUsage(u1: TokenUsage, u2: TokenUsage): TokenUsage {
  return {
    promptTokens: u1.promptTokens + u2.promptTokens,
    completionTokens: u1.completionTokens + u2.completionTokens,
    totalTokens: u1.totalTokens + u2.totalTokens,
  };
}

export function normalizeLlmJsonText(text: string): string {
  // Clean up LLM markers
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}
