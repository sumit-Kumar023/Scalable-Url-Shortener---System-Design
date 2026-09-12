import { Request, Response, NextFunction } from 'express';
import { checkRateLimit } from '../services/rateLimiter.service';
import { AppError } from '../utils/AppError';

export function rateLimit(prefix: string, limit: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = req.ip ?? 'unknown';
    const key = `${prefix}:${identifier}`;

    const result = await checkRateLimit(key, limit);

    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(result.resetSeconds));

    if (!result.allowed) {
      return next(AppError.tooManyRequests('Too many requests, please slow down', 'RATE_LIMITED'));
    }
    next();
  };
}
