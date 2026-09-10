import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { requestTracing } from './middleware/requestTracing.js';
import { requestLogger } from './middleware/logging.js';
import { generalLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import { getLogger } from './utils/logger.js';
import { RequestWithId } from './middleware/requestTracing.js';
import { env } from './config/env.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Request tracing (must be before logging)
app.use(requestTracing);

// Request logging
app.use(requestLogger);

// General rate limiting
app.use(generalLimiter);

/**
 * Health check endpoint.
 */
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static uploads (local mode only, but harmless in s3 mode too)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/jobs', jobRoutes);
app.use('/api/v1/admin', adminRoutes);

// Local file upload — only register when UPLOAD_MODE is 'local'
if (env.UPLOAD_MODE === 'local') {
  app.use('/api/v1/upload', uploadRoutes);
  console.log('[BE1] Local upload endpoint enabled at /api/v1/upload');
} else {
  console.log(
    '[BE1] UPLOAD_MODE=s3 — local upload endpoint disabled; use /api/v1/verification/presigned-url',
  );
}

/**
 * 404 handler.
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Global error handler.
 * The 4th parameter (`_next`) is required by Express to recognise this as an
 * error handler even though we don't use it. `void _next;` satisfies the
 * unused-parameter check without changing the signature.
 */
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  void _next; // Required by Express signature; intentionally unused.
  const log = getLogger((req as RequestWithId).requestId);
  log.error('[BE1] - Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});