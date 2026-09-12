import { Request, Response } from 'express';
import { isMongoConnected } from '../config/db';
import { isRedisAvailable } from '../config/redis';
import { getCacheStats } from '../services/cache.service';

export function healthCheck(_req: Request, res: Response) {
  const mongoUp = isMongoConnected();
  const redisUp = isRedisAvailable();

  const status = mongoUp ? 'ok' : 'degraded';

  res.status(mongoUp ? 200 : 503).json({
    success: mongoUp,
    data: {
      status,
      mongo: mongoUp ? 'up' : 'down',
      redis: redisUp ? 'up' : 'down',
      cache: getCacheStats(),
      timestamp: new Date().toISOString(),
    },
  });
}
