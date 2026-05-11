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
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: Redis not configured in production. Rate limiting is required for security.");
    }
    return { success: true, remaining: limit };
  }

  // Atomic set-if-not-exists with expiration + increment
  const isNew = await redis.set(key, 1, { nx: true, ex: windowSeconds });
  let current: number;
  
  if (isNew) {
    current = 1;
  } else {
    current = (await redis.incr(key)) as number;
  }

  if (current > limit) {
    return { success: false, remaining: 0 };
  }

  return { success: true, remaining: limit - current };
}
