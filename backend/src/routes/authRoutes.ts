import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// BUG-003 FIX: removed `router.use(generalLimiter)`.
// `generalLimiter` is already mounted globally in `index.ts` via
// `app.use(generalLimiter)`. Mounting it again here incremented the
// same Redis counter twice per auth request, halving the effective
// threshold and doubling Redis round-trips.
//
// Only `loginLimiter` is mounted here, per-route, because the TDD §8 A07
// policy requires a stricter, login-specific budget than the global one.

// Public routes
router.post('/signup', AuthController.signup);
router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;