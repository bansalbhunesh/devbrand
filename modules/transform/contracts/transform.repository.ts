import { TokenUsage } from "@/modules/ai/infrastructure/llm.gateway";

export interface SaveTransformResultInput {
  userId: string;
  prUrl: string;
  output: any; // NarrativeDraft
  usage: TokenUsage;
  slug: string;
}

export interface TransformRepository {
  saveResult(input: SaveTransformResultInput): Promise<{ id: string; slug: string }>;
  incrementGenerationCount(userId: string): Promise<void>;
}
