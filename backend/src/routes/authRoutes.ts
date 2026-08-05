import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { loginLimiter, generalLimiter } from '../middleware/rateLimit.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Apply general rate limit to all auth routes (optional)
router.use(generalLimiter);

// Public routes
router.post('/signup', AuthController.signup);
router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh', AuthController.refresh);

// Protected routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;