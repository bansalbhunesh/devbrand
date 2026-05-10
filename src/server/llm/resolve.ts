/** OpenAI-compat base URL (…/…/openai without trailing slash handled by caller) and helpers. */

const DEFAULT_GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

const DEFAULT_OLLAMA_ROOT = "http://localhost:11434";

/** Ollama / OpenAI-compat host root without `/v1` (e.g. `http://localhost:11434`). */
export function ollamaRootFromEnv(): string {
  const openhumanOverride = process.env.OPENHUMAN_OLLAMA_BASE_URL?.trim();
  if (openhumanOverride && openhumanOverride.length > 0) {
    return openhumanOverride.replace(/\/+$/, "");
  }

  const host = process.env.OLLAMA_HOST?.trim()?.replace(/\/+$/, "") ?? "";
  if (host.length > 0) {
    if (host.includes("://")) return host;
    return `http://${host}`;
  }

  return DEFAULT_OLLAMA_ROOT;
}

/** Converts Ollama root to OpenAI-compat base (`…/v1`). */
export function ollamaOpenAiCompatBase(): string {
  const root = ollamaRootFromEnv().replace(/\/+$/, "");
  if (root.endsWith("/v1")) return root;
  return `${root}/v1`;
}

/**
 * 1. `OPENAI_COMPAT_BASE_URL` if set  
 * 2. Else Gemini (Google AI Studio) when `GEMINI_API_KEY` is set — same host as official OpenAI-compat docs  
 * 3. Else local Ollama OpenAI-compat base from `OPENHUMAN_OLLAMA_BASE_URL` / `OLLAMA_HOST` / localhost
 */
export function resolvedCompatChatBaseUrl(): string {
  const explicit = process.env.OPENAI_COMPAT_BASE_URL?.trim()?.replace(/\/+$/, "") ?? "";
  if (explicit.length > 0) return explicit;

  if (process.env.GEMINI_API_KEY?.trim()) {
    return DEFAULT_GEMINI_OPENAI_BASE.replace(/\/+$/, "");
  }

  return ollamaOpenAiCompatBase();
}

export function resolveOpenAiCompatApiKey(): string {
  return (
    process.env.OPENAI_COMPAT_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    ""
  );
}

export function resolveOpenAiCompatModel(): string | null {
  const m = process.env.OPENAI_COMPAT_MODEL?.trim() || process.env.GEMINI_MODEL?.trim();
  if (m && m.length > 0) return m;
  if (process.env.GEMINI_API_KEY?.trim()) {
    return process.env.DEFAULT_GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  }
  return null;
}
