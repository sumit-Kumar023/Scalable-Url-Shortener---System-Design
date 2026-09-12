import { z } from 'zod';

const aliasRegex = /^[a-zA-Z0-9_-]{3,32}$/;

export const createUrlSchema = z.object({
  originalUrl: z.string().trim().min(1, 'originalUrl is required'),
  customAlias: z
    .string()
    .trim()
    .regex(aliasRegex, 'customAlias must be 3-32 characters: letters, numbers, - or _')
    .optional(),
  // Either an ISO date string or a shorthand like "1h", "24h", "7d", "30d".
  expiresAt: z.string().trim().optional(),
});

export const updateUrlSchema = z.object({
  originalUrl: z.string().trim().min(1).optional(),
  expiresAt: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateUrlInput = z.infer<typeof createUrlSchema>;
export type UpdateUrlInput = z.infer<typeof updateUrlSchema>;

const SHORTHAND_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

/** Resolves "1h" / "24h" / "7d" / "30d" or an ISO date string into a Date. */
export function resolveExpiration(value?: string | null): Date | null {
  if (!value) return null;
  if (SHORTHAND_MS[value]) {
    return new Date(Date.now() + SHORTHAND_MS[value]);
  }
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    throw new Error('expiresAt must be one of 1h, 24h, 7d, 30d, or a valid ISO date string');
  }
  return parsed;
}
