import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/roleGuard.js';
import { generalLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(generalLimiter);
router.use(authenticate);
router.use(requireRole(['admin']));

router.get('/users', AdminController.listUsers);

export default router;