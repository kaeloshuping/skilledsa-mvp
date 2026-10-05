import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth.js';
import { getLogger } from '../utils/logger.js';
import { RequestWithId } from '../middleware/requestTracing.js';
import { env } from '../config/env.js';

const router = Router();

// Uploads live under the backend project root: <backend>/uploads/
const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const ALLOWED_MIME = ['image/jpeg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Sanitise the category string to prevent path traversal.
 */
const sanitiseCategory = (raw: unknown): string => {
  const value = typeof raw === 'string' && raw.length > 0 ? raw : 'misc';
  return value.replace(/[^a-z0-9_-]/gi, '_');
};

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const category = sanitiseCategory((req.body as { category?: string })?.category);
    const dir = path.join(UPLOAD_ROOT, category);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME.join(', ')}`,
        ),
      );
      return;
    }
    cb(null, true);
  },
});

router.use(authenticate);

router.post('/', (req, res) => {
  const log = getLogger((req as RequestWithId).requestId);

  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        log.warn('[BE1] - Upload rejected: file too large');
        res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
        return;
      }
      const message = err instanceof Error ? err.message : 'Upload failed';
      log.error('[BE1] - Upload error', { error: message });
      res.status(400).json({ error: message });
      return;
    }

    if (!req.file) {
      log.warn('[BE1] - Upload rejected: no file');
      res.status(400).json({ error: 'No file uploaded (expected field "file")' });
      return;
    }

    const category = sanitiseCategory((req.body as { category?: string })?.category);
    const relativePath = `${category}/${req.file.filename}`;
    const url = `${env.API_URL}/uploads/${relativePath}`;

    log.info('[BE1] - Local file uploaded', {
      key: relativePath,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });

    res.status(201).json({
      url,
      key: relativePath,
      size: req.file.size,
    });
  });
});

export default router;