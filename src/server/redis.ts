import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<{ success: boolean; remaining: number }> {
  if (!redis) {
    // Local dev fallback: no-op (allow all)
    return { success: true, remaining: limit };
  }

  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  if (current > limit) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: limit - current };
}
