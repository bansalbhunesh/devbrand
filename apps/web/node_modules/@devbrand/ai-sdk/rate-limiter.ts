import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create an in-memory Map to act as a fallback cache if Redis is not configured
const fallbackCache = new Map<string, number>();

export const getRateLimiter = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    // If we have Upstash Redis, use it for cross-region persistent rate limiting
    const redis = new Redis({ url, token });
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      analytics: true,
      prefix: "devbrand_ratelimit",
    });
  }

  // Fallback: Local in-memory sliding window (very basic, limits by hour locally)
  return {
    limit: async (identifier: string) => {
      const now = Date.now();
      const hour = 1000 * 60 * 60;
      const key = `${identifier}_${Math.floor(now / hour)}`;
      const current = fallbackCache.get(key) || 0;
      
      if (current >= 5) {
        return { success: false, remaining: 0, reset: now + hour };
      }
      
      fallbackCache.set(key, current + 1);
      
      // Cleanup old keys
      if (Math.random() < 0.1) {
        for (const [k] of fallbackCache.entries()) {
          if (!k.endsWith(`_${Math.floor(now / hour)}`)) {
            fallbackCache.delete(k);
          }
        }
      }
      
      return { success: true, remaining: 5 - current - 1, reset: now + hour };
    }
  };
};
