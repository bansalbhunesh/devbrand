import { completionContentToText } from "./content";
import {
  resolvedCompatChatBaseUrl,
  resolveOpenAiCompatApiKey,
  resolveOpenAiCompatModel,
} from "./resolve";
import { env } from "@/lib/env";

export type LlmProviderKind = "anthropic" | "openai_compatible";

export type CompleteTextParams = {
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
  /**
   * If true, marks the system prompt for Anthropic's ephemeral prompt cache.
   * Only meaningful when the system prompt is long and reused across calls
   * (e.g. engine layer5/layer6 templates). Ignored for OpenAI-compat providers.
   */
  cacheSystem?: boolean;
  /** Per-call timeout override in ms. Falls back to LLM_TIMEOUT_MS or 60_000. */
  timeoutMs?: number;
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  /** Anthropic-specific: tokens served from the prompt cache (90% cheaper). */
  cacheReadInputTokens: number;
  /** Anthropic-specific: tokens written to the prompt cache (25% premium). */
  cacheCreationInputTokens: number;
};

export type CompleteTextResult = {
  text: string;
  usage: TokenUsage;
};

export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable?: boolean,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

const ZERO_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
};

export function getLlmProvider(): LlmProviderKind {
  return env.LLM_PROVIDER;
}

export function normalizeLlmJsonText(raw: string): string {
  return raw
    .trim()
    .replace(/^```json\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
}

type ChatCompletionJson = {
  choices?: Array<{ message?: { content?: unknown } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

function resolveTimeoutMs(override?: number): number {
  if (override && override > 0) return override;
  const raw = process.env.LLM_TIMEOUT_MS;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}

/** Sleep with cancellation support. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason ?? new Error("aborted"));
    });
  });
}

/**
 * Run a fetch-style call with retry on transient errors (429 + 5xx + network).
 * Backoff: 500ms, 1500ms, 3500ms (caps at 3 attempts).
 */
async function withRetry<T>(
  attempt: () => Promise<T>,
  isRetryable: (err: unknown) => boolean,
): Promise<T> {
  const delays = [500, 1500, 3500];
  let lastErr: unknown;
  for (let i = 0; i <= delays.length; i++) {
    try {
      return await attempt();
    } catch (e) {
      lastErr = e;
      if (i === delays.length || !isRetryable(e)) throw e;
      await sleep(delays[i]);
    }
  }
  throw lastErr;
}

async function completeOpenAiCompatible(
  params: CompleteTextParams,
): Promise<CompleteTextResult> {
  const base = resolvedCompatChatBaseUrl();
  const model = resolveOpenAiCompatModel();
  if (!model) {
    throw new LlmError(
      "Set OPENAI_COMPAT_MODEL or GEMINI_MODEL (or GEMINI_API_KEY for default gemini-2.0-flash)",
    );
  }

  const url = `${base}/chat/completions`;
  const apiKey = resolveOpenAiCompatApiKey();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new LlmError("LLM call timed out")),
    resolveTimeoutMs(params.timeoutMs),
  );

  try {
    const res = await withRetry(
      async () => {
        const r = await fetch(url, {
          method: "POST",
          headers,
          signal: controller.signal,
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
        if (!r.ok) {
          const snippet = await r.text();
          throw new LlmError(
            `OpenAI-compatible LLM HTTP ${r.status}: ${snippet.slice(0, 800)}`,
            r.status,
            r.status === 429 || r.status >= 500,
          );
        }
        return r;
      },
      (e) =>
        e instanceof LlmError ? e.retryable === true : e instanceof TypeError,
    );

    const data = (await res.json()) as ChatCompletionJson;
    const rawContent = data.choices?.[0]?.message?.content;
    const text = completionContentToText(rawContent);
    if (!text.trim()) {
      throw new LlmError("OpenAI-compatible LLM returned empty content");
    }
    return {
      text,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function completeAnthropic(
  params: CompleteTextParams,
): Promise<CompleteTextResult> {
  const { default: AnthropicCtor } = await import("@anthropic-ai/sdk");
  const client = new AnthropicCtor({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.CLAUDE_MODEL;
  const timeoutMs = resolveTimeoutMs(params.timeoutMs);

  // For Anthropic, the SDK supports system as a string OR an array of blocks
  // with cache_control. Cache eligibility requires >= 1024 input tokens; below
  // that the directive is silently ignored, so it's safe to set opportunistically.
  const systemForApi = params.cacheSystem
    ? [
        {
          type: "text" as const,
          text: params.system,
          cache_control: { type: "ephemeral" as const },
        },
      ]
    : params.system;

  const response = await withRetry(
    () =>
      client.messages.create(
        {
          model,
          max_tokens: params.maxTokens,
          temperature: params.temperature ?? 0,
          system: systemForApi as never,
          messages: [{ role: "user", content: params.user }],
        },
        { timeout: timeoutMs },
      ),
    (e) => {
      const status = (e as { status?: number }).status;
      return status === 429 || (typeof status === "number" && status >= 500);
    },
  );

  const block = response.content[0];
  const text = block?.type === "text" ? block.text : "";
  if (!text.trim()) {
    throw new LlmError("Anthropic returned empty content");
  }

  const usage = response.usage as
    | {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number;
        cache_creation_input_tokens?: number;
      }
    | undefined;

  return {
    text,
    usage: {
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      cacheReadInputTokens: usage?.cache_read_input_tokens ?? 0,
      cacheCreationInputTokens: usage?.cache_creation_input_tokens ?? 0,
    },
  };
}

/**
 * Top-level LLM completion. Returns text + token usage for cost attribution.
 * Throws LlmError (with optional `status` and `retryable` flag) instead of
 * returning silently empty strings.
 */
export async function completeText(
  params: CompleteTextParams,
): Promise<CompleteTextResult> {
  if (getLlmProvider() === "openai_compatible") {
    return completeOpenAiCompatible(params);
  }
  return completeAnthropic(params);
}

/** Sum a list of usage records. */
export function sumUsage(parts: TokenUsage[]): TokenUsage {
  return parts.reduce(
    (acc: TokenUsage, u: TokenUsage) => ({
      inputTokens: acc.inputTokens + u.inputTokens,
      outputTokens: acc.outputTokens + u.outputTokens,
      cacheReadInputTokens: acc.cacheReadInputTokens + u.cacheReadInputTokens,
      cacheCreationInputTokens:
        acc.cacheCreationInputTokens + u.cacheCreationInputTokens,
    }),
    ZERO_USAGE,
  );
}

export const ZeroUsage = ZERO_USAGE;
