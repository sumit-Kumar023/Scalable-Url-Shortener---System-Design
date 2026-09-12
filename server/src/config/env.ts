import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),

  MONGO_URI: required('MONGO_URI', 'mongodb://localhost:27017/url-shortener'),

  REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? undefined,

  JWT_SECRET: required('JWT_SECRET', 'dev-only-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '7d',

  BASE_URL: process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? '4000'}`,

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  DEFAULT_EXPIRATION_MS: parseInt(process.env.DEFAULT_EXPIRATION_MS ?? String(30 * 24 * 60 * 60 * 1000), 10),

  RATE_LIMIT_REGISTER_MAX: parseInt(process.env.RATE_LIMIT_REGISTER_MAX ?? '5', 10),
  RATE_LIMIT_LOGIN_MAX: parseInt(process.env.RATE_LIMIT_LOGIN_MAX ?? '5', 10),
  RATE_LIMIT_CREATE_URL_MAX: parseInt(process.env.RATE_LIMIT_CREATE_URL_MAX ?? '10', 10),
  RATE_LIMIT_REDIRECT_MAX: parseInt(process.env.RATE_LIMIT_REDIRECT_MAX ?? '100', 10),
  RATE_LIMIT_WINDOW_SECONDS: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS ?? '60', 10),

  DISABLE_REDIS_CACHE: process.env.DISABLE_REDIS_CACHE === 'true',
};
