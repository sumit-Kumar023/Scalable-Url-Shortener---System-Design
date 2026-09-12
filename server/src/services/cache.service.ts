import { redisClient, isRedisAvailable } from '../config/redis';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Minimum data needed to safely redirect AND independently re-verify
 * expiration, without a second MongoDB round trip on a cache hit.
 */
export interface CachedUrl {
  originalUrl: string;
  expiresAt: string | null; // ISO string or null (never expires)
  isActive: boolean;
}

const CACHE_KEY_PREFIX = 'url:';
// Cache entries never outlive the URL's own expiration (see setCachedUrl).
const MAX_CACHE_TTL_SECONDS = 24 * 60 * 60; // safety ceiling for links with no expiresAt

// In-memory counters. Deliberately simple (single-process) - see README
// "Click tracking / metrics" section for how this could be made
// cluster-wide (e.g. Redis INCR counters) if multiple instances need a
// unified hit-rate view.
let hits = 0;
let misses = 0;

export function getCacheKey(shortCode: string): string {
  return `${CACHE_KEY_PREFIX}${shortCode}`;
}

export async function getCachedUrl(shortCode: string): Promise<CachedUrl | null> {
  if (env.DISABLE_REDIS_CACHE || !isRedisAvailable()) {
    return null;
  }
  try {
    const raw = await redisClient.get(getCacheKey(shortCode));
    if (!raw) {
      misses++;
      return null;
    }
    hits++;
    return JSON.parse(raw) as CachedUrl;
  } catch (err: any) {
    logger.error('Redis GET failed, falling back to MongoDB', { error: err.message, shortCode });
    misses++;
    return null;
  }
}

export async function setCachedUrl(shortCode: string, data: CachedUrl): Promise<void> {
  if (env.DISABLE_REDIS_CACHE || !isRedisAvailable()) {
    return;
  }
  try {
    let ttlSeconds = MAX_CACHE_TTL_SECONDS;
    if (data.expiresAt) {
      const secondsUntilExpiry = Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000);
      // Redis TTL must never exceed the URL's own expiration, otherwise
      // a stale "still valid" entry could outlive the real expiration.
      ttlSeconds = Math.max(1, Math.min(secondsUntilExpiry, MAX_CACHE_TTL_SECONDS));
    }
    await redisClient.set(getCacheKey(shortCode), JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err: any) {
    logger.error('Redis SET failed (non-fatal)', { error: err.message, shortCode });
  }
}

export async function invalidateCachedUrl(shortCode: string): Promise<void> {
  if (!isRedisAvailable()) return;
  try {
    await redisClient.del(getCacheKey(shortCode));
  } catch (err: any) {
    logger.error('Redis DEL failed (non-fatal)', { error: err.message, shortCode });
  }
}

export function getCacheStats() {
  const total = hits + misses;
  return {
    hits,
    misses,
    hitRate: total === 0 ? 0 : Number(((hits / total) * 100).toFixed(2)),
  };
}

export function resetCacheStats(): void {
  hits = 0;
  misses = 0;
}
