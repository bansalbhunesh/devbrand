import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (_redis) return _redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  current: number;
}

/**
 * Sliding Window Rate Limiting using Redis Sorted Sets (ZSET)
 * Prevents burst attacks at window boundaries.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: Redis not configured in production. Rate limiting is required for security.");
    }
    return { success: true, remaining: limit, resetAt: Date.now() + windowSeconds * 1000, current: 0 };
  }

  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const redisKey = `rate_limit:${key}`;

  try {
    const multi = redis.multi();
    // Remove entries older than the window
    multi.zremrangebyscore(redisKey, 0, windowStart);
    // Add current request
    const requestId = crypto.randomUUID();
    multi.zadd(redisKey, { score: now, member: requestId });
    // Count active requests in window
    multi.zcard(redisKey);
    // Set expiry for the whole set
    multi.expire(redisKey, windowSeconds + 1);

    const results = await multi.exec();
    const current = results[2] as number;

    const success = current <= limit;
    return {
      success,
      remaining: Math.max(0, limit - current),
      resetAt: now + windowSeconds * 1000,
      current,
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    // Fallback to allow in case of Redis failure to prevent lockout, but log it
    return { success: true, remaining: 1, resetAt: now + windowSeconds * 1000, current: 1 };
  }
}

/**
 * Tier-aware rate limiting (Strict, Standard, Generous)
 */
export async function rateLimitWithUser(
  userId: string,
  action: string,
  tier: "strict" | "standard" | "generous" = "standard",
  baseLimit: number = 10
): Promise<RateLimitResult> {
  const multipliers = {
    strict: 0.5,
    standard: 1.0,
    generous: 2.0,
  };
  const limit = Math.floor(baseLimit * multipliers[tier]);
  return rateLimit(`user:${userId}:${action}`, limit, 60);
}

/**
 * Security Event Logging to Redis
 * Tracks suspicious activities for audit and automated blocking.
 */
export async function logSecurityEvent(
  eventType: "login_attempt" | "rate_limit_exceeded" | "oauth_state_mismatch" | "payment_failed" | "session_mismatch",
  userId: string | null,
  ip: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const event = {
    type: eventType,
    userId,
    ip,
    timestamp: Date.now(),
    details,
  };

  const now = Date.now();
  const eventStr = JSON.stringify(event);

  try {
    const multi = redis.multi();
    multi.zadd("security:events", { score: now, member: eventStr });
    multi.zadd(`security:${eventType}`, { score: now, member: eventStr });
    // Expire after 30 days
    multi.expire("security:events", 60 * 60 * 24 * 30);
    multi.expire(`security:${eventType}`, 60 * 60 * 24 * 30);
    await multi.exec();
  } catch (error) {
    console.error("Security logging failed:", error);
  }
}

/**
 * IP Blocking Utility
 */
export async function blockIP(ip: string, reason: string, durationSeconds: number = 3600): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`block:${ip}`, JSON.stringify({ reason, blockedAt: Date.now() }), { ex: durationSeconds });
  await logSecurityEvent("rate_limit_exceeded", null, ip, { reason, action: "blocked", durationSeconds });
}

export async function isIPBlocked(ip: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  return (await redis.exists(`block:${ip}`)) === 1;
}
