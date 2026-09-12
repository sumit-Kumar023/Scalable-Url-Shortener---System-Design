import { Router } from 'express';
import {
  createUrl,
  listUrls,
  getUrl,
  updateUrl,
  deleteUrl,
  getUrlAnalytics,
} from '../controllers/url.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { createUrlSchema, updateUrlSchema } from '../validators/url.validator';
import { rateLimit } from '../middleware/rateLimiter.middleware';
import { env } from '../config/env';

const router = Router();

router.use(requireAuth);

router.post('/', rateLimit('create-url', env.RATE_LIMIT_CREATE_URL_MAX), validateBody(createUrlSchema), createUrl);
router.get('/', listUrls);
router.get('/:id', getUrl);
router.patch('/:id', validateBody(updateUrlSchema), updateUrl);
router.delete('/:id', deleteUrl);
router.get('/:id/analytics', getUrlAnalytics);

export default router;
