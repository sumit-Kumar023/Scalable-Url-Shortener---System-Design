import { Router } from 'express';
import { register, login, logout, me } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';
import { requireAuth } from '../middleware/auth.middleware';
import { rateLimit } from '../middleware/rateLimiter.middleware';
import { env } from '../config/env';

const router = Router();

router.post('/register', rateLimit('register', env.RATE_LIMIT_REGISTER_MAX), validateBody(registerSchema), register);
router.post('/login', rateLimit('login', env.RATE_LIMIT_LOGIN_MAX), validateBody(loginSchema), login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

export default router;
