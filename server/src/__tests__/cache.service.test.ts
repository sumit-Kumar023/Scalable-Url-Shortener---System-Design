import {
  getCachedUrl,
  setCachedUrl,
  invalidateCachedUrl,
  getCacheStats,
  resetCacheStats,
} from '../services/cache.service';
import { redisClient } from '../config/redis';

// ioredis is mapped to ioredis-mock in jest.config.js, so redisClient here
// behaves like a real Redis instance without needing Docker.

describe('cache.service (cache-aside behavior)', () => {
  beforeEach(async () => {
    await redisClient.flushall();
    resetCacheStats();
  });

  it('returns null and counts a miss when the key does not exist', async () => {
    const result = await getCachedUrl('missing');
    expect(result).toBeNull();
    expect(getCacheStats().misses).toBe(1);
  });

  it('stores and retrieves a cached URL, counting a hit', async () => {
    await setCachedUrl('abc1234', {
      originalUrl: 'https://example.com',
      expiresAt: null,
      isActive: true,
    });

    const result = await getCachedUrl('abc1234');
    expect(result?.originalUrl).toBe('https://example.com');
    expect(getCacheStats().hits).toBe(1);
  });

  it('caps the Redis TTL so it never exceeds the URL expiration', async () => {
    const expiresAt = new Date(Date.now() + 5000).toISOString(); // 5 seconds out
    await setCachedUrl('soon-expires', { originalUrl: 'https://example.com', expiresAt, isActive: true });

    const ttl = await redisClient.ttl('url:soon-expires');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(5);
  });

  it('removes a key on invalidation', async () => {
    await setCachedUrl('to-delete', { originalUrl: 'https://example.com', expiresAt: null, isActive: true });
    await invalidateCachedUrl('to-delete');
    const result = await getCachedUrl('to-delete');
    expect(result).toBeNull();
  });

  it('computes hit rate correctly', async () => {
    await setCachedUrl('hit-code', { originalUrl: 'https://example.com', expiresAt: null, isActive: true });
    await getCachedUrl('hit-code'); // hit
    await getCachedUrl('hit-code'); // hit
    await getCachedUrl('miss-code'); // miss

    const stats = getCacheStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(66.67, 1);
  });
});
