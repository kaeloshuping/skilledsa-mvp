import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { requestTracing } from './middleware/requestTracing.js';
import { requestLogger } from './middleware/logging.js';
import { generalLimiter } from './middleware/rateLimit.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import { getLogger } from './utils/logger.js';
import { RequestWithId } from './middleware/requestTracing.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Request tracing (must be before logging)
app.use(requestTracing);

// Request logging
app.use(requestLogger);

// General rate limiting (applies to all routes except login which has its own)
app.use(generalLimiter);

/**
 * Health check endpoint.
 */
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/verification', verificationRoutes);
app.use('/api/v1/jobs', jobRoutes);

/**
 * 404 handler.
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Global error handler.
 * Explicitly typed as ErrorRequestHandler to avoid overload mismatch.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Cast req to RequestWithId to safely access requestId
  const log = getLogger((req as RequestWithId).requestId);
  log.error('[BE1] - Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});