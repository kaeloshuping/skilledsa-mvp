import { Router } from 'express';
import { VerificationController } from '../controllers/verificationController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { generalLimiter } from '../middleware/rateLimit.js';

const router = Router();
router.use(generalLimiter);

// All verification routes require authentication
router.use(authenticate);

// Presigned URL and submission
router.post('/presigned-url', VerificationController.getPresignedUrl);
router.post('/submit', VerificationController.submit);
router.get('/status', VerificationController.getStatus);

// Admin-only routes
router.get('/queue', requireRole(['admin']), VerificationController.getQueue);
router.put('/queue/:id/approve', requireRole(['admin']), VerificationController.approve);
router.put('/queue/:id/reject', requireRole(['admin']), VerificationController.reject);

export default router;