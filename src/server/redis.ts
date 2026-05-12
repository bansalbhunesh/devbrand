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
    console.warn(
      "Redis credentials missing. Rate limiting and security logs are degraded.",
    );
    return null;
  }

  try {
    _redis = new Redis({ url, token });
    return _redis;
  } catch (e) {
    console.error("Failed to initialize Redis:", e);
    return null;
  }
}

/**
 * Atomic rate limiting. Fails CLOSED when Redis is unavailable so a Redis
 * outage can't uncap the Anthropic/Razorpay surface. Set RATE_LIMIT_FAIL_OPEN=true
 * in local dev only if you need to bypass.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const redis = getRedis();
  const failOpen = env.RATE_LIMIT_FAIL_OPEN === true;
  const onFailure = () => ({
    success: failOpen,
    remaining: failOpen ? limit : 0,
    resetAt: Date.now() + windowSeconds * 1000,
  });

  if (!redis) return onFailure();

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
    console.error("Rate limiting error:", e);
    return onFailure();
  }
}

/**
 * Log a security event to Redis with structured data.
 */
export async function logSecurityEvent(
  type: string,
  userId: string | null,
  ip: string,
  metadata: Record<string, unknown> = {},
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
    await redis.zremrangebyrank("security:events", 0, -1001);
  } catch (e) {
    console.error("Failed to log security event:", e);
  }
}

export type SecurityEventRow = {
  type: string;
  ip: string;
  timestamp: Date;
  details?: Record<string, string>;
};

/**
 * Recent security events (newest first). Empty when Redis is unavailable.
 */
export async function readSecurityEvents(
  limit = 50,
): Promise<SecurityEventRow[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const end = Math.max(0, limit - 1);
    const raw = await redis.zrange("security:events", 0, end, {
      rev: true,
    });
    const rows: SecurityEventRow[] = [];
    for (const str of raw as string[]) {
      try {
        const e = JSON.parse(String(str)) as {
          type: string;
          ip: string;
          metadata?: Record<string, unknown>;
          timestamp: string;
        };
        const meta = e.metadata as Record<string, unknown> | undefined;
        rows.push({
          type: e.type,
          ip: e.ip ?? "unknown",
          timestamp: new Date(e.timestamp || Date.now()),
          details: meta
            ? Object.fromEntries(
                Object.entries(meta).map(([k, v]) => [k, String(v)]),
              )
            : undefined,
        });
      } catch {
        /* skip malformed */
      }
    }
    return rows;
  } catch (e) {
    console.error("readSecurityEvents failed:", e);
    return [];
  }
}
