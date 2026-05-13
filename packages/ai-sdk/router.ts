import { PromptKey, PromptRegistry, TokenUsage, ZeroUsage, sumUsage } from "./llm.gateway";
import { logger, trace } from "@devbrand/telemetry";

/**
 * ELITE ARCHITECTURE: AI Inference Router.
 * Handles model selection, fallbacks, and cost optimization.
 */

export interface InferenceOptions {
  promptKey: PromptKey;
  variables: any[];
  preferredModel?: "claude-3-5-sonnet" | "gpt-4o" | "haiku";
}

export class InferenceRouter {
  /**
   * Route an inference request with automatic fallback.
   */
  async complete(options: InferenceOptions) {
    return trace(`ai.complete:${options.promptKey}`, async (span) => {
      const model = options.preferredModel || "claude-3-5-sonnet";
      span.setTag("model", model);

      try {
        const result = await this.executeInference(model, options);
        return result;
      } catch (err) {
        logger.warn(`Primary model ${model} failed. Attempting fallback...`, { error: (err as any).message });
        
        // Failover logic
        const fallbackModel = model === "claude-3-5-sonnet" ? "gpt-4o" : "haiku";
        span.setTag("fallback_model", fallbackModel);
        
        return this.executeInference(fallbackModel, options);
      }
    });
  }

  private async executeInference(model: string, options: InferenceOptions) {
    const prompt = PromptRegistry[options.promptKey];
    
    if (!prompt) {
      throw new Error(`Prompt not found in registry: ${options.promptKey}`);
    }
    
    const content = (prompt as any).template(...options.variables);

    logger.info(`Inference: ${model}`, { key: options.promptKey });

    // Mock provider call
    return {
      text: `[Output from ${model}]`,
      usage: { ...ZeroUsage },
      model,
    };
  }
}

export const aiRouter = new InferenceRouter();
