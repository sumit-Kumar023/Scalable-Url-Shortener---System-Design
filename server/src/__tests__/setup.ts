process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGO_URI = 'mongodb://localhost:27017/url-shortener-test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';

// jest.config.js maps `ioredis` -> `ioredis-mock`, so this connects to an
// in-memory fake Redis (no Docker/real Redis needed to run the suite).
// The mock client "connects" asynchronously, so tests that depend on
// isRedisAvailable() must wait for it to be ready before running.
import { isRedisAvailable } from '../config/redis';

beforeAll(async () => {
  const deadline = Date.now() + 2000;
  while (!isRedisAvailable() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
});
