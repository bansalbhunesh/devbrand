import { completionContentToText } from "./content";
import { resolvedCompatChatBaseUrl, resolveOpenAiCompatApiKey, resolveOpenAiCompatModel } from "./resolve";

export type LlmProviderKind = "anthropic" | "openai_compatible";

export type CompleteTextParams = {
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
};

export function getLlmProvider(): LlmProviderKind {
  const raw = (process.env.LLM_PROVIDER ?? "anthropic").trim().toLowerCase();
  return raw === "openai_compatible" ? "openai_compatible" : "anthropic";
}

export function normalizeLlmJsonText(raw: string): string {
  return raw.trim().replace(/^```json\n?/i, "").replace(/\n?```$/i, "").trim();
}

type ChatCompletionJson = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

async function completeOpenAiCompatible(params: CompleteTextParams): Promise<string> {
  const base = resolvedCompatChatBaseUrl();
  const model = resolveOpenAiCompatModel();
  if (!model) {
    throw new Error(
      "Set OPENAI_COMPAT_MODEL or GEMINI_MODEL (or GEMINI_API_KEY for default gemini-2.0-flash)",
    );
  }

  const url = `${base}/chat/completions`;
  const apiKey = resolveOpenAiCompatApiKey();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      max_tokens: params.maxTokens,
      temperature: params.temperature ?? 0,
    }),
  });

  if (!res.ok) {
    const snippet = await res.text();
    throw new Error(`OpenAI-compatible LLM HTTP ${res.status}: ${snippet.slice(0, 800)}`);
  }

  const data = (await res.json()) as ChatCompletionJson;
  const rawContent = data.choices?.[0]?.message?.content;
  const text = completionContentToText(rawContent);
  if (!text.trim()) throw new Error("OpenAI-compatible LLM returned empty content");
  return text;
}

async function completeAnthropic(params: CompleteTextParams): Promise<string> {
  const { default: AnthropicCtor } = await import("@anthropic-ai/sdk");
  const client = new AnthropicCtor({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022";
  const response = await client.messages.create({
    model,
    max_tokens: params.maxTokens,
    temperature: params.temperature ?? 0,
    system: params.system,
    messages: [{ role: "user", content: params.user }],
  });
  const block = response.content[0];
  return block?.type === "text" ? block.text : "";
}

export async function completeText(params: CompleteTextParams): Promise<string> {
  if (getLlmProvider() === "openai_compatible") {
    return completeOpenAiCompatible(params);
  }
  return completeAnthropic(params);
}
