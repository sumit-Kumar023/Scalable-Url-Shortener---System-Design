import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Redis is a cache and rate-limit store, NEVER the source of truth.
 * If Redis is unreachable the application must keep serving requests
 * using MongoDB directly - it must not crash.
 */
let redisAvailable = false;

export const redisClient = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  // Do not let ioredis endlessly queue commands while Redis is down -
  // fail fast so callers can fall back to MongoDB instead of hanging.
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  lazyConnect: false,
  enableOfflineQueue: false,
});

redisClient.on('connect', () => {
  redisAvailable = true;
  logger.info('Redis connected', { host: env.REDIS_HOST, port: env.REDIS_PORT });
});

redisClient.on('error', (err) => {
  if (redisAvailable) {
    logger.error('Redis connection error', { error: err.message });
  }
  redisAvailable = false;
});

redisClient.on('close', () => {
  redisAvailable = false;
});

export function isRedisAvailable(): boolean {
  return redisAvailable;
}
