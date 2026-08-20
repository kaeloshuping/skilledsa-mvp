import { Router } from 'express';
import { JobController } from '../controllers/jobController.js';
import { authenticate } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimit.js';

const router = Router();

// Apply rate limiting and authentication to all job routes
router.use(generalLimiter);
router.use(authenticate);

router.post('/', JobController.createJob);
router.get('/', JobController.listJobs);
router.get('/:id', JobController.getJobById);
router.put('/:id', JobController.updateJob);
router.delete('/:id', JobController.deleteJob);

export default router;