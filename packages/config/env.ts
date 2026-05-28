import { z } from "zod";

/**
 * Normalizes a URL by removing trailing slashes and ensuring a protocol.
 */
export function normalizeAppUrl(url: string | undefined): string {
  if (!url) return "";
  let normalized = url.trim().replace(/\/+$/, "");
  if (normalized && !/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

const envSchema = z.object({
  // App & Environment
  FEATURE_REPO_ROAST: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  APP_URL: z.string().transform(normalizeAppUrl).pipe(z.string().url()),

  // Database
  DATABASE_URL: z.string().url(),

  // Cache & Rate Limiting
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  // Dev-only escape hatch: when "true", rate limiting allows requests if Redis is
  // unreachable. Never set this in production — Upstash incidents would uncap the
  // Anthropic budget. Default is fail-closed.
  RATE_LIMIT_FAIL_OPEN: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),

  // Auth
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_TOKEN: z.string().optional(),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),


  // AI
  ANTHROPIC_API_KEY: z.string().optional(),
  LLM_PROVIDER: z.enum(["anthropic", "openai_compatible"]).default("anthropic"),
  CLAUDE_MODEL: z.string().default("claude-3-7-sonnet-20250219"),
  OPENAI_COMPAT_MODEL: z.string().optional(),
  OPENAI_COMPAT_BASE_URL: z.string().url().optional(),
  OPENAI_COMPAT_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DEFAULT_GEMINI_MODEL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _envCache: Env | null = null;

/** Call at the start of each edge/worker request after merging bindings into `process.env`. */
export function invalidateEnvCache(): void {
  _envCache = null;
}

/**
 * Validates and returns the environment variables.
 * Ensure environment variables are merged into `process.env` before calling `getEnv()`.
 */

export function getEnv(overrides?: Record<string, unknown>): Env {
  const mergedOverrides =
    overrides && typeof overrides === "object"
      ? (overrides as Record<string, unknown>)
      : undefined;

  const source = {
    ...process.env,
    ...mergedOverrides,
  } as Record<string, string | undefined>;

  if (!mergedOverrides && _envCache) {
    return _envCache;
  }

  const result = envSchema.safeParse(source);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMsg = Object.entries(errors)
      .map(([key, val]) => `${key}: ${val?.join(", ")}`)
      .join("\n");

    console.error("Invalid environment variables:\n", errorMsg);

    if (source.NODE_ENV === "production") {
      throw new Error(
        `Invalid environment variables in production:\n${errorMsg}`,
      );
    }

    console.warn(
      "Continuing with invalid/missing env in non-production — set .env from .env.example.",
    );
    return source as unknown as Env;
  }

  if (!mergedOverrides) {
    _envCache = result.data;
  }
  return result.data;
}

/**
 * Typed read-through to validated env. Prefer `getEnv()` inside hot paths after
 * `invalidateEnvCache()` + binding merge on each Worker request.
 */
export const env = new Proxy({} as Env, {
  get(_, prop: string) {
    return getEnv()[prop as keyof Env];
  },
});
