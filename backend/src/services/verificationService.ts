import prisma from '../config/database.js';
import { env } from '../config/env.js';
import { getLogger } from '../utils/logger.js';
import { S3Service } from './s3Service.js';

// Mock email service (logs to console in dev).
const sendEmail = (to: string, subject: string, text: string) => {
  const log = getLogger();
  log.info('[BE1] - Email (dev) sent', { to, subject, text });
};

/**
 * Extract the storage key from an upload URL.
 *
 * Upload URLs are constructed by uploadRoutes.ts as:
 *   `${env.API_URL}/uploads/${key}`
 * For example:
 *   http://localhost:3000/api/v1/uploads/misc/<uuid>.png
 * The storage key is everything after `/uploads/`:
 *   misc/<uuid>.png
 *
 * Rejects URLs that do not point to our uploads path, and any key that
 * contains traversal sequences. Called before any storage access.
 */
const extractKey = (url: string): string => {
  const marker = '/uploads/';
  const idx = url.indexOf(marker);
  if (idx === -1) {
    throw new Error('Invalid file URL: not an uploads path');
  }

  const expectedOrigin = new URL(env.API_URL).origin;
  if (!url.startsWith(expectedOrigin)) {
    throw new Error('Invalid file URL: unexpected origin');
  }

  const key = url.slice(idx + marker.length);
  if (!key || key.includes('..') || key.startsWith('/')) {
    throw new Error('Invalid file URL: unsafe key');
  }
  return key;
};

export class VerificationService {
  /**
   * Submit a verification request for a user.
   * Confirms the referenced files exist in storage, then upserts the
   * VerificationRequest row.
   */
  static async submit(
    userId: string,
    data: {
      id_photo_url: string;
      selfie_url: string;
      certificate_url?: string;
    },
  ) {
    const log = getLogger();

    const existing = await prisma.verificationRequest.findUnique({
      where: { user_id: userId },
    });
    if (existing && existing.status === 'pending') {
      throw new Error('You already have a pending verification request');
    }
    if (existing && existing.status === 'verified') {
      throw new Error('You are already verified');
    }

    try {
      const idKey = extractKey(data.id_photo_url);
      const selfieKey = extractKey(data.selfie_url);
      const certKey = data.certificate_url ? extractKey(data.certificate_url) : undefined;

      await S3Service.validateFile(idKey);
      await S3Service.validateFile(selfieKey);
      if (certKey) {
        await S3Service.validateFile(certKey);
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      const verification = await prisma.verificationRequest.upsert({
        where: { user_id: userId },
        update: {
          id_photo_url: data.id_photo_url,
          selfie_url: data.selfie_url,
          certificate_url: data.certificate_url || null,
          status: 'pending',
          admin_notes: null,
          admin_id: null,
          reviewed_at: null,
        },
        create: {
          user_id: userId,
          role: user.role,
          id_photo_url: data.id_photo_url,
          selfie_url: data.selfie_url,
          certificate_url: data.certificate_url,
          status: 'pending',
        },
      });

      log.info('[BE1] - Verification request submitted', { userId });
      return verification;
    } catch (error) {
      log.error('[BE1] - Submit verification error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the verification status of a user.
   */
  static async getStatus(userId: string) {
    return prisma.verificationRequest.findUnique({
      where: { user_id: userId },
    });
  }

  /**
   * Admin: get pending verification requests, oldest first.
   */
  static async getPendingQueue() {
    return prisma.verificationRequest.findMany({
      where: { status: 'pending' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Admin: approve a verification request.
   * Marks the request verified, promotes the user, and writes an audit log.
   */
  static async approve(requestId: string, adminId: string, requestIdLog: string, notes?: string) {
    const log = getLogger(requestIdLog);
    const request = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });
    if (!request) throw new Error('Verification request not found');
    if (request.status !== 'pending') {
      throw new Error(`Request is already ${request.status}`);
    }

    const updated = await prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: 'verified',
        admin_id: adminId,
        admin_notes: notes || null,
        reviewed_at: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: request.user_id },
      data: { verification_status: 'verified' },
    });

    await prisma.adminLog.create({
      data: {
        request_id: requestIdLog,
        admin_id: adminId,
        action: 'APPROVE_VERIFICATION',
        target_type: 'verification_request',
        target_id: requestId,
        before_state: { status: request.status },
        after_state: { status: 'verified' },
        ip_address: '0.0.0.0',
        user_agent: 'backend',
      },
    });

    sendEmail(
      request.user.email,
      'Verification Approved',
      `Your verification request has been approved. You are now a verified ${request.user.role}.`,
    );

    log.info('[BE1] - Verification approved', {
      requestId,
      userId: request.user_id,
      adminId,
    });
    return updated;
  }

  /**
   * Admin: reject a verification request.
   * Marks the request rejected, updates the user, and writes an audit log.
   */
  static async reject(requestId: string, adminId: string, requestIdLog: string, reason: string) {
    const log = getLogger(requestIdLog);
    const request = await prisma.verificationRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });
    if (!request) throw new Error('Verification request not found');
    if (request.status !== 'pending') {
      throw new Error(`Request is already ${request.status}`);
    }

    const updated = await prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        admin_id: adminId,
        admin_notes: reason,
        reviewed_at: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: request.user_id },
      data: { verification_status: 'rejected' },
    });

    await prisma.adminLog.create({
      data: {
        request_id: requestIdLog,
        admin_id: adminId,
        action: 'REJECT_VERIFICATION',
        target_type: 'verification_request',
        target_id: requestId,
        before_state: { status: request.status },
        after_state: { status: 'rejected', reason },
        ip_address: '0.0.0.0',
        user_agent: 'backend',
      },
    });

    sendEmail(
      request.user.email,
      'Verification Rejected',
      `Your verification request has been rejected. Reason: ${reason}`,
    );

    log.info('[BE1] - Verification rejected', {
      requestId,
      userId: request.user_id,
      adminId,
    });
    return updated;
  }
}
