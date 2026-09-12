jest.mock('../models/ShortUrl');
jest.mock('../services/cache.service');

import { ShortUrl } from '../models/ShortUrl';
import { createShortUrl, assertSafeUrl } from '../services/url.service';
import { AppError } from '../utils/AppError';

const mockedShortUrl = ShortUrl as jest.Mocked<typeof ShortUrl>;

describe('assertSafeUrl', () => {
  it('rejects javascript: scheme', () => {
    expect(() => assertSafeUrl('javascript:alert(1)')).toThrow(AppError);
  });

  it('rejects data: scheme', () => {
    expect(() => assertSafeUrl('data:text/html,hello')).toThrow(AppError);
  });

  it('rejects malformed URLs', () => {
    expect(() => assertSafeUrl('not-a-url')).toThrow(AppError);
  });

  it('accepts https URLs', () => {
    expect(() => assertSafeUrl('https://example.com/page')).not.toThrow();
  });
});

describe('createShortUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a URL with a generated short code on first attempt', async () => {
    (mockedShortUrl.create as jest.Mock).mockResolvedValueOnce({ shortCode: 'abc1234' });

    const result = await createShortUrl({ userId: '507f1f77bcf86cd799439011', originalUrl: 'https://example.com' });

    expect(mockedShortUrl.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ shortCode: 'abc1234' });
  });

  it('retries on duplicate key error (11000) and succeeds on second attempt', async () => {
    const dupError: any = new Error('duplicate key');
    dupError.code = 11000;

    (mockedShortUrl.create as jest.Mock)
      .mockRejectedValueOnce(dupError)
      .mockResolvedValueOnce({ shortCode: 'xyz9999' });

    const result = await createShortUrl({ userId: '507f1f77bcf86cd799439011', originalUrl: 'https://example.com' });

    expect(mockedShortUrl.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ shortCode: 'xyz9999' });
  });

  it('throws after exhausting all collision retry attempts', async () => {
    const dupError: any = new Error('duplicate key');
    dupError.code = 11000;
    (mockedShortUrl.create as jest.Mock).mockRejectedValue(dupError);

    await expect(createShortUrl({ userId: '507f1f77bcf86cd799439011', originalUrl: 'https://example.com' })).rejects.toThrow(AppError);
  });

  it('rejects a custom alias that is already taken', async () => {
    (mockedShortUrl.findOne as jest.Mock).mockResolvedValueOnce({ shortCode: 'taken' });

    await expect(
      createShortUrl({ userId: '507f1f77bcf86cd799439011', originalUrl: 'https://example.com', customAlias: 'taken' })
    ).rejects.toThrow('already taken');
  });

  it('rejects unsafe URL schemes before touching the database', async () => {
    await expect(
      createShortUrl({ userId: '507f1f77bcf86cd799439011', originalUrl: 'javascript:alert(1)' })
    ).rejects.toThrow(AppError);
    expect(mockedShortUrl.create).not.toHaveBeenCalled();
  });
});
