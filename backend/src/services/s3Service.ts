import AWS from 'aws-sdk';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { getLogger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

// Configure AWS SDK (used only when UPLOAD_MODE=s3).
AWS.config.update({
  region: env.AWS_REGION,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

// Storage root for local-mode uploads. Mirrors uploadRoutes.ts.
const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

// Size cap applied at submit time, matching the S3 pipeline.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// MIME allow-list shared with the upload pipeline.
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

// Extension → MIME mapping used to classify local files by their stored
// extension. Files reach disk only via the upload pipeline, which is why
// extension-based classification is trustworthy here.
const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
};

// Extensions rejected regardless of MIME.
const DANGEROUS_EXTENSIONS = ['.exe', '.php', '.sh', '.bat', '.cmd'];

export class S3Service {
  /**
   * Generate a presigned URL for uploading a file directly to S3.
   * Used only when UPLOAD_MODE=s3.
   */
  static async generatePresignedUrl(
    fileName: string,
    contentType: string,
    userId: string,
  ): Promise<{ url: string; key: string }> {
    const log = getLogger();

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new Error(
        `Unsupported file type: ${contentType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      throw new Error(`File extension ${ext} is not allowed`);
    }

    const key = `${userId}/${randomUUID()}-${fileName}`;

    const params = {
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Expires: env.S3_PRESIGNED_URL_EXPIRY,
      ContentType: contentType,
    };

    const url = s3.getSignedUrl('putObject', params);
    log.debug('[BE1] - Generated presigned URL', {
      key,
      expiry: env.S3_PRESIGNED_URL_EXPIRY,
    });
    return { url, key };
  }

  /**
   * Validate a file reference before it is attached to a domain record.
   *
   * Backend is selected by UPLOAD_MODE:
   *   - 'local' (development): file lives under <backend>/uploads/<key>
   *   - 's3'    (production):  file is an S3 object at <key>
   *
   * Rejects unsafe keys (path traversal, absolute paths) before any
   * storage access. Enforces the same MIME allow-list and size cap as
   * the upload pipeline.
   */
  static async validateFile(
    key: string,
  ): Promise<{ size: number; contentType: string }> {
    const log = getLogger();

    // Reject unsafe keys up front — no storage access attempted.
    if (!key || key.includes('..') || key.startsWith('/') || path.isAbsolute(key)) {
      throw new Error('unsafe key');
    }

    try {
      return env.UPLOAD_MODE === 'local'
        ? await S3Service.validateLocalFile(key)
        : await S3Service.validateRemoteFile(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('[BE1] - File validation failed', { key, error: message });
      throw new Error(`File validation failed: ${message}`);
    }
  }

  /**
   * Local-mode validation: verify the file exists under UPLOAD_ROOT,
   * is a regular file, is within the size cap, and has an allowed
   * extension.
   */
  private static async validateLocalFile(
    key: string,
  ): Promise<{ size: number; contentType: string }> {
    const log = getLogger();

    const filePath = path.resolve(UPLOAD_ROOT, key);
    // Defence in depth: even though '..' was rejected above, re-verify
    // that the resolved path stays inside UPLOAD_ROOT.
    if (filePath !== UPLOAD_ROOT && !filePath.startsWith(UPLOAD_ROOT + path.sep)) {
      throw new Error('unsafe key');
    }

    let stats: fs.Stats;
    try {
      stats = fs.statSync(filePath);
    } catch {
      throw new Error('file not found');
    }

    if (!stats.isFile()) {
      throw new Error('not a regular file');
    }

    if (stats.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `file size exceeds maximum (${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)`,
      );
    }

    const ext = path.extname(key).toLowerCase();
    const contentType = MIME_BY_EXTENSION[ext];
    if (!contentType || !ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new Error(`invalid file type: ${ext || 'unknown'}`);
    }

    log.debug('[BE1] - Local file validated', {
      key,
      size: stats.size,
      contentType,
    });
    return { size: stats.size, contentType };
  }

  /**
   * S3-mode validation: HEAD the object and verify size and content type.
   */
  private static async validateRemoteFile(
    key: string,
  ): Promise<{ size: number; contentType: string }> {
    const log = getLogger();

    const head = await s3
      .headObject({ Bucket: env.S3_BUCKET_NAME, Key: key })
      .promise();

    const size = head.ContentLength || 0;
    const contentType = head.ContentType || 'application/octet-stream';

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new Error(`invalid MIME type: ${contentType}`);
    }

    if (size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `file size exceeds maximum (${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)`,
      );
    }

    const ext = key.substring(key.lastIndexOf('.')).toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      throw new Error(`file extension ${ext} is not allowed`);
    }

    log.debug('[BE1] - S3 file validated', { key, size, contentType });
    return { size, contentType };
  }
}