import { Router } from 'express';
import { UserController } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimit.js';

const router = Router();
router.use(generalLimiter);

// All routes require authentication
router.use(authenticate);

// Specific routes MUST come before the dynamic /:id route
router.put('/me', UserController.updateMe);

router.get('/:id', UserController.getUser);
router.put('/:id', UserController.updateUser);

export default router;