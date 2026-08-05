import AWS from 'aws-sdk';
import { env } from '../config/env.js';
import { getLogger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

// Configure AWS SDK
AWS.config.update({
  region: env.AWS_REGION,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
];

// Reject dangerous file extensions
const DANGEROUS_EXTENSIONS = ['.exe', '.php', '.sh', '.bat', '.cmd'];

export class S3Service {
  /**
   * Generate a presigned URL for uploading a file to S3.
   * Returns the URL and the object key.
   */
  static async generatePresignedUrl(
    fileName: string,
    contentType: string,
    userId: string,
  ): Promise<{ url: string; key: string }> {
    const log = getLogger();
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new Error(`Unsupported file type: ${contentType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`);
    }

    // Check file extension
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (DANGEROUS_EXTENSIONS.includes(ext)) {
      throw new Error(`File extension ${ext} is not allowed`);
    }

    // Generate unique key: user_id/uuid-filename
    const key = `${userId}/${randomUUID()}-${fileName}`;

    const params = {
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
      Expires: env.S3_PRESIGNED_URL_EXPIRY,
      ContentType: contentType,
    };

    const url = s3.getSignedUrl('putObject', params);
    log.debug('[BE1] - Generated presigned URL', { key, expiry: env.S3_PRESIGNED_URL_EXPIRY });
    return { url, key };
  }

  /**
   * Validate an uploaded file by checking its existence, size, and MIME type.
   * Throws if invalid.
   */
  static async validateFile(key: string): Promise<{ size: number; contentType: string }> {
    const log = getLogger();
    try {
      const head = await s3.headObject({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
      }).promise();

      const size = head.ContentLength || 0;
      const contentType = head.ContentType || 'application/octet-stream';

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        throw new Error(`Invalid MIME type: ${contentType}`);
      }

      // Validate file size (max 10MB)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (size > MAX_SIZE) {
        throw new Error(`File size exceeds maximum (${MAX_SIZE / 1024 / 1024}MB)`);
      }

      // Validate extension via key (optional extra)
      const ext = key.substring(key.lastIndexOf('.')).toLowerCase();
      if (DANGEROUS_EXTENSIONS.includes(ext)) {
        throw new Error(`File extension ${ext} is not allowed`);
      }

      log.debug('[BE1] - File validated', { key, size, contentType });
      return { size, contentType };
    } catch (error) {
      log.error('[BE1] - File validation failed', { key, error: (error as Error).message });
      throw new Error(`File validation failed: ${(error as Error).message}`);
    }
  }
}