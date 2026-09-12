import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { code: err.code, path: req.path });
    }
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Mongoose duplicate key error that slipped through a service.
  if (err?.code === 11000) {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_KEY', message: 'Resource already exists' },
    });
  }

  // Mongoose validation error.
  if (err?.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: err.message },
    });
  }

  logger.error('Unhandled error', {
    message: err?.message,
    stack: env.NODE_ENV === 'production' ? undefined : err?.stack,
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      // Never leak stack traces in production.
      ...(env.NODE_ENV !== 'production' ? { detail: err?.message } : {}),
    },
  });
}
