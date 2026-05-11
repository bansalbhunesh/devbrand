import { z } from "zod";

/**
 * Normalizes a URL by removing trailing slashes and ensuring a protocol.
 */
function normalizeUrl(url: string | undefined): string {
  if (!url) return "";
  let normalized = url.trim().replace(/\/+$/, "");
  if (normalized && !normalized.startsWith("http")) {
    normalized = `https://${normalized}`;
  }
  return normalized;
}

const envSchema = z.object({
  // App & Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().transform(normalizeUrl).pipe(z.string().url()),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Cache & Rate Limiting
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  
  // Auth
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_TOKEN: z.string().optional(), // Fallback for some internal scripts
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  
  // Billing
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  
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

/**
 * Validates and returns the environment variables.
 * In Cloudflare Workers, we pass the 'env' object from the fetch handler.
 */
export function getEnv(overrides?: any): Env {
  const source = {
    ...process.env,
    ...overrides,
  };

  const result = envSchema.safeParse(source);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMsg = Object.entries(errors)
      .map(([key, val]) => `${key}: ${val?.join(", ")}`)
      .join("\n");
    
    console.error("❌ Invalid Environment Variables:\n", errorMsg);
    
    // In production, we throw to prevent running with an unstable config.
    // In dev, we might want to be more lenient or provide defaults.
    if (source.NODE_ENV === "production") {
      throw new Error(`Invalid environment variables in production:\n${errorMsg}`);
    }
    
    return source as unknown as Env;
  }

  return result.data;
}

/**
 * A singleton-like proxy for environment variables.
 * Note: In Cloudflare Workers, process.env is often empty, 
 * so we must populate it at the start of the request.
 */
export const env = new Proxy({} as Env, {
  get(_, prop: string) {
    // If process.env.APP_URL is already set (e.g. by our polyfill), use it
    return getEnv()[prop as keyof Env];
  }
});
