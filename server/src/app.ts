import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { connectMongo } from './config/db';
import { logger } from './utils/logger';
import authRoutes from './routes/auth.routes';
import urlRoutes from './routes/url.routes';
import redirectRoutes from './routes/redirect.routes';
import healthRoutes from './routes/health.routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.middleware';

export function createApp(): Application {
  const app = express();

  // `trust proxy` is required so req.ip reflects the real client IP when
  // running behind Nginx (otherwise every request appears to come from
  // the Nginx container, which would break per-IP rate limiting).
  app.set('trust proxy', true);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10kb' })); // small limit: basic protection against oversized payloads
  app.use(
    morgan((tokens, req, res) => {
      // Route through our structured logger instead of morgan's default
      // plain-text format, so every HTTP log line is JSON like the rest.
      logger.info('http_request', {
        method: tokens.method(req, res),
        route: tokens.url(req, res),
        status: Number(tokens.status(req, res)),
        responseTimeMs: Number(tokens['response-time'](req, res)),
      });
      return '';
    })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/urls', urlRoutes);
  app.use('/health', healthRoutes);

  // Redirect route is mounted LAST and at the root path since it is a
  // catch-all for `/:shortCode`. Anything not matched above (API routes,
  // health) falls through to here.
  app.use('/', redirectRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function bootstrap() {
  await connectMongo();
  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT}`, { env: env.NODE_ENV });
  });
}

// Only auto-start when run directly (not when imported by tests).
if (require.main === module) {
  bootstrap().catch((err) => {
    logger.error('Failed to start server', { error: err.message });
    process.exit(1);
  });
}
