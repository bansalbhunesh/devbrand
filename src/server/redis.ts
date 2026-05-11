import { Redis } from "@upstash/redis";
import { env } from "../lib/env";

/**
 * Lazy Redis client initialization with safe-mode fallback.
 */
let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;

  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("⚠️ Redis credentials missing. Rate limiting is disabled (Safe Mode).");
    return null;
  }

  try {
    _redis = new Redis({ url, token });
    return _redis;
  } catch (e) {
    console.error("❌ Failed to initialize Redis:", e);
    return null;
  }
}

/**
 * Atomic rate limiting with a graceful "allow" fallback if Redis is down.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const redis = getRedis();
  
  if (!redis) {
    // Graceful fallback: Allow the request but log the missing infrastructure
    return { success: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000 };
  }

  try {
    const identifier = `ratelimit:${key}`;
    const now = Date.now();
    const resetAt = now + windowSeconds * 1000;

    const count = await redis.incr(identifier);
    if (count === 1) {
      await redis.expire(identifier, windowSeconds);
    }

    return {
      success: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch (e) {
    console.error("❌ Rate limiting error (Failing Open):", e);
    return { success: true, remaining: 1, resetAt: Date.now() };
  }
}

/**
 * Log a security event to Redis with structured data.
 */
export async function logSecurityEvent(
  type: string,
  userId: string | null,
  ip: string,
  metadata: any = {}
) {
  const redis = getRedis();
  if (!redis) return;

  const event = {
    type,
    userId,
    ip,
    metadata,
    timestamp: new Date().toISOString(),
  };

  try {
    await redis.zadd("security:events", {
      score: Date.now(),
      member: JSON.stringify(event),
    });
    // Keep only last 1000 events
    await redis.zremrangebyrank("security:events", 0, -1001);
  } catch (e) {
    console.error("❌ Failed to log security event:", e);
  }
}
