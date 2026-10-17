import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// The general rate limiter is mounted globally in index.ts via
// `app.use(generalLimiter)`. It is intentionally not mounted here a
// second time because express-rate-limit increments the same Redis
// key per invocation, so a second mount would halve the effective
// threshold for every auth request.
//
// `loginLimiter` is mounted only on POST /login because TDD §8 A07
// requires a stricter, route-specific budget than the global limit.

// Public routes
router.post('/signup', AuthController.signup);
router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;
