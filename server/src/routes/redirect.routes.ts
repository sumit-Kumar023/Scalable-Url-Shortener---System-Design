import { Router } from 'express';
import { redirectToOriginalUrl } from '../controllers/redirect.controller';
import { rateLimit } from '../middleware/rateLimiter.middleware';
import { env } from '../config/env';

const router = Router();

router.get('/:shortCode', rateLimit('redirect', env.RATE_LIMIT_REDIRECT_MAX), redirectToOriginalUrl);

export default router;
