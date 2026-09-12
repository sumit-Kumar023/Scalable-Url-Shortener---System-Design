import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { resolveRedirect, recordClick } from '../services/url.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export const redirectToOriginalUrl = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { shortCode } = req.params;
  const start = Date.now();

  const { originalUrl, source } = await resolveRedirect(shortCode);

  // Click tracking must not slow down the redirect: fire the update
  // without awaiting it. Errors are logged, never surfaced to the user.
  recordClick(shortCode).catch((err) => {
    logger.error('Failed to record click (non-fatal)', { error: err.message, shortCode });
  });

  logger.info('Redirect served', {
    shortCode,
    cache: source === 'cache' ? 'HIT' : 'MISS',
    durationMs: Date.now() - start,
  });

  res.redirect(302, originalUrl);
});
