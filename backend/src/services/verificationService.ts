import prisma from '../config/database.js';
import { getLogger } from '../utils/logger.js';
import { S3Service } from './s3Service.js';

// Mock email service (logs to console in dev)
const sendEmail = (to: string, subject: string, text: string) => {
  const log = getLogger();
  log.info('[BE1] - Email (dev) sent', { to, subject, text });
};

export class VerificationService {
  /**
   * Submit a verification request.
   * Validates that all files exist and are valid.
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

    const extractKey = (url: string) => {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      if (path.startsWith('/')) {
        return path.substring(1);
      }
      return path;
    };

    try {
      const idKey = extractKey(data.id_photo_url);
      const selfieKey = extractKey(data.selfie_url);
      let certKey: string | undefined;
      if (data.certificate_url) {
        certKey = extractKey(data.certificate_url);
      }

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
      log.error('[BE1] - Submit verification error', { error: (error as Error).message });
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
   * Admin: get pending verification requests.
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
   */
  static async approve(
    requestId: string,
    adminId: string,
    requestIdLog: string,
    notes?: string,
  ) {
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

    log.info('[BE1] - Verification approved', { requestId, userId: request.user_id, adminId });
    return updated;
  }

  /**
   * Admin: reject a verification request.
   */
  static async reject(
    requestId: string,
    adminId: string,
    requestIdLog: string,
    reason: string,
  ) {
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

    log.info('[BE1] - Verification rejected', { requestId, userId: request.user_id, adminId });
    return updated;
  }
}