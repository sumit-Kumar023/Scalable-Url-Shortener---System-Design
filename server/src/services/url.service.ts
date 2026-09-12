import { Types } from 'mongoose';
import { ShortUrl, IShortUrl } from '../models/ShortUrl';
import { AppError } from '../utils/AppError';
import { generateShortCode, MAX_GENERATION_ATTEMPTS } from './shortCode.service';
import { getCachedUrl, setCachedUrl, invalidateCachedUrl, CachedUrl } from './cache.service';
import { logger } from '../utils/logger';

const UNSAFE_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];

// These path segments are owned by the frontend SPA (see nginx.conf) and
// must never be issued as auto-generated or custom-alias short codes,
// otherwise a link like /login would be ambiguous between "go to the
// login page" and "redirect via short code".
const RESERVED_ALIASES = new Set([
  'login',
  'register',
  'logout',
  'dashboard',
  'create',
  'analytics',
  'api',
  'health',
  'assets',
  'favicon.ico',
]);

export function assertSafeUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw AppError.badRequest('originalUrl must be a valid absolute URL', 'INVALID_URL');
  }
  const scheme = parsed.protocol.toLowerCase();
  if (UNSAFE_SCHEMES.includes(scheme)) {
    throw AppError.badRequest(`URL scheme "${scheme}" is not allowed`, 'UNSAFE_SCHEME');
  }
  if (scheme !== 'http:' && scheme !== 'https:') {
    throw AppError.badRequest('Only http and https URLs are supported', 'UNSUPPORTED_SCHEME');
  }
}

interface CreateUrlInput {
  userId: string;
  originalUrl: string;
  customAlias?: string;
  expiresAt?: Date | null;
}

export async function createShortUrl(input: CreateUrlInput): Promise<IShortUrl> {
  assertSafeUrl(input.originalUrl);

  if (input.customAlias) {
    if (RESERVED_ALIASES.has(input.customAlias.toLowerCase())) {
      throw AppError.conflict('That alias is reserved and cannot be used', 'ALIAS_RESERVED');
    }
    const existingAlias = await ShortUrl.findOne({
      $or: [{ shortCode: input.customAlias }, { customAlias: input.customAlias }],
    });
    if (existingAlias) {
      throw AppError.conflict('That custom alias is already taken', 'ALIAS_TAKEN');
    }

    try {
      return await ShortUrl.create({
        userId: new Types.ObjectId(input.userId),
        originalUrl: input.originalUrl,
        shortCode: input.customAlias,
        customAlias: input.customAlias,
        expiresAt: input.expiresAt ?? null,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        // The unique index is the final authority - a concurrent request
        // could have taken the alias between our check and this insert.
        throw AppError.conflict('That custom alias is already taken', 'ALIAS_TAKEN');
      }
      throw err;
    }
  }

  // No custom alias: generate a random code and retry on collision.
  // See services/shortCode.service.ts for why "check then insert" alone
  // is unsafe and why the unique index matters here.
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const shortCode = generateShortCode();
    try {
      return await ShortUrl.create({
        userId: new Types.ObjectId(input.userId),
        originalUrl: input.originalUrl,
        shortCode,
        expiresAt: input.expiresAt ?? null,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        lastError = err;
        logger.warn('Short code collision, retrying', { attempt, shortCode });
        continue;
      }
      throw err;
    }
  }
  logger.error('Exhausted short code generation attempts', { attempts: MAX_GENERATION_ATTEMPTS });
  throw AppError.internal('Could not generate a unique short code, please try again', 'CODE_GENERATION_FAILED');
}

export interface ResolvedRedirect {
  originalUrl: string;
  source: 'cache' | 'database';
}

/**
 * Cache-aside redirect resolution.
 * 1. Try Redis.
 * 2. On hit, verify expiration using the cached data itself (no DB call).
 * 3. On miss, fall back to MongoDB (source of truth), verify expiration,
 *    then populate the cache for next time.
 */
export async function resolveRedirect(shortCode: string): Promise<ResolvedRedirect> {
  const cached = await getCachedUrl(shortCode);
  if (cached) {
    if (!cached.isActive || isExpired(cached.expiresAt)) {
      // Stale cache entry for a now-expired/deleted link - don't trust it.
      await invalidateCachedUrl(shortCode);
    } else {
      return { originalUrl: cached.originalUrl, source: 'cache' };
    }
  }

  // Cache miss (or stale hit) - MongoDB is the source of truth.
  const doc = await ShortUrl.findOne({ shortCode });
  if (!doc || !doc.isActive) {
    throw AppError.notFound('Short URL not found', 'URL_NOT_FOUND');
  }
  if (isExpired(doc.expiresAt ? doc.expiresAt.toISOString() : null)) {
    throw AppError.notFound('This link has expired', 'URL_EXPIRED');
  }

  const cachePayload: CachedUrl = {
    originalUrl: doc.originalUrl,
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
    isActive: doc.isActive,
  };
  await setCachedUrl(shortCode, cachePayload);

  return { originalUrl: doc.originalUrl, source: 'database' };
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/**
 * Fire-and-forget-friendly click tracking. Uses a single atomic update
 * so the redirect response does not wait on a read-modify-write cycle.
 * See README "Click tracking" for how this could move to an async queue.
 */
export async function recordClick(shortCode: string): Promise<void> {
  await ShortUrl.updateOne(
    { shortCode },
    { $inc: { clickCount: 1 }, $set: { lastClickedAt: new Date() } }
  );
}

export async function listUrlsForUser(userId: string): Promise<IShortUrl[]> {
  return ShortUrl.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
}

export async function getUrlForUser(userId: string, id: string): Promise<IShortUrl> {
  const doc = await ShortUrl.findOne({ _id: id, userId: new Types.ObjectId(userId) });
  if (!doc) {
    throw AppError.notFound('URL not found', 'URL_NOT_FOUND');
  }
  return doc;
}

export async function updateUrlForUser(
  userId: string,
  id: string,
  updates: Partial<Pick<IShortUrl, 'originalUrl' | 'expiresAt' | 'isActive'>>
): Promise<IShortUrl> {
  const doc = await getUrlForUser(userId, id);

  if (updates.originalUrl) {
    assertSafeUrl(updates.originalUrl);
    doc.originalUrl = updates.originalUrl;
  }
  if (updates.expiresAt !== undefined) {
    doc.expiresAt = updates.expiresAt;
  }
  if (updates.isActive !== undefined) {
    doc.isActive = updates.isActive;
  }
  await doc.save();
  await invalidateCachedUrl(doc.shortCode);
  return doc;
}

export async function deleteUrlForUser(userId: string, id: string): Promise<void> {
  const doc = await getUrlForUser(userId, id);
  await ShortUrl.deleteOne({ _id: doc._id });
  await invalidateCachedUrl(doc.shortCode);
}
