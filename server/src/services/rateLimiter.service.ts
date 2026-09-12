import { redisClient, isRedisAvailable } from '../config/redis';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Fixed-window rate limiting backed by Redis, so limits are enforced
 * correctly across multiple stateless backend instances (an in-memory
 * counter would be per-process and let each instance grant its own
 * quota, defeating the limit under horizontal scaling).
 *
 * Algorithm: INCR the key for the current window; set an expiry only on
 * the first increment. Simple to explain in an interview, and "good
 * enough" burst behavior for this project (a sliding-window log or
 * token bucket would be the natural upgrade, noted in the README).
 *
 * Fails OPEN if Redis is unavailable: rate limiting is a protective
 * feature, not the source of truth, so we do not want a Redis outage to
 * take down the whole API.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetSeconds: number;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number = env.RATE_LIMIT_WINDOW_SECONDS
): Promise<RateLimitResult> {
  if (!isRedisAvailable()) {
    logger.warn('Rate limiter bypassed - Redis unavailable (failing open)', { key });
    return { allowed: true, remaining: limit, limit, resetSeconds: windowSeconds };
  }

  const redisKey = `ratelimit:${key}`;
  try {
    const count = await redisClient.incr(redisKey);
    if (count === 1) {
      await redisClient.expire(redisKey, windowSeconds);
    }
    const ttl = await redisClient.ttl(redisKey);
    const resetSeconds = ttl > 0 ? ttl : windowSeconds;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      limit,
      resetSeconds,
    };
  } catch (err: any) {
    logger.error('Rate limiter Redis error - failing open', { error: err.message, key });
    return { allowed: true, remaining: limit, limit, resetSeconds: windowSeconds };
  }
}
