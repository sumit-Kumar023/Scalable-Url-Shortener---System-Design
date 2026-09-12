import { checkRateLimit } from '../services/rateLimiter.service';
import { redisClient } from '../config/redis';

describe('checkRateLimit', () => {
  beforeEach(async () => {
    await redisClient.flushall();
  });

  it('allows requests under the limit', async () => {
    const r1 = await checkRateLimit('test-key', 3, 60);
    const r2 = await checkRateLimit('test-key', 3, 60);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it('blocks requests once the limit is exceeded', async () => {
    await checkRateLimit('burst-key', 2, 60);
    await checkRateLimit('burst-key', 2, 60);
    const third = await checkRateLimit('burst-key', 2, 60);

    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it('tracks separate keys independently (per-IP isolation)', async () => {
    await checkRateLimit('ip-1', 1, 60);
    const ip2Result = await checkRateLimit('ip-2', 1, 60);

    expect(ip2Result.allowed).toBe(true);
  });
});
