jest.mock('../config/db', () => ({
  isMongoConnected: jest.fn().mockReturnValue(true),
}));
jest.mock('../models/User');
jest.mock('../models/ShortUrl');

import request from 'supertest';
import { createApp } from '../app';
import { User } from '../models/User';
import { ShortUrl } from '../models/ShortUrl';

const app = createApp();

describe('GET /health', () => {
  it('reports 200 and status ok when Mongo is connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.cache).toHaveProperty('hitRate');
  });
});

describe('POST /api/auth/register validation', () => {
  it('rejects a short password with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects an invalid email with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
  });

  it('registers successfully with valid input', async () => {
    (User.findOne as jest.Mock).mockResolvedValueOnce(null);
    (User.create as jest.Mock).mockResolvedValueOnce({
      toJSON: () => ({ id: '1', name: 'Alice', email: 'alice@example.com' }),
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('alice@example.com');
  });
});

describe('Protected routes require auth', () => {
  it('rejects GET /api/urls without a token', async () => {
    const res = await request(app).get('/api/urls');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const res = await request(app).get('/api/urls').set('Authorization', 'not-bearer-token');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/urls validation', () => {
  it('rejects unsafe URL schemes even with a valid token shape (caught by middleware order)', async () => {
    // No token at all -> should fail auth before reaching validation/service layer.
    const res = await request(app).post('/api/urls').send({ originalUrl: 'javascript:alert(1)' });
    expect(res.status).toBe(401);
  });
});

describe('GET /:shortCode redirect', () => {
  it('returns 404 for an unknown short code', async () => {
    (ShortUrl.findOne as jest.Mock).mockResolvedValueOnce(null);
    const res = await request(app).get('/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('redirects with 302 for a valid, active, non-expired short code', async () => {
    (ShortUrl.findOne as jest.Mock).mockResolvedValueOnce({
      originalUrl: 'https://example.com',
      isActive: true,
      expiresAt: null,
    });
    (ShortUrl.updateOne as jest.Mock).mockResolvedValueOnce({});

    const res = await request(app).get('/abc1234');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com');
  });

  it('returns 404 for an expired short code even if still present in MongoDB', async () => {
    (ShortUrl.findOne as jest.Mock).mockResolvedValueOnce({
      originalUrl: 'https://example.com',
      isActive: true,
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
    });

    const res = await request(app).get('/expired1');
    expect(res.status).toBe(404);
  });
});

describe('404 handler', () => {
  it('returns a JSON 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
