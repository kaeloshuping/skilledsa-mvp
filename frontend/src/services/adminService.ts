// src/services/adminService.ts
import apiClient from './apiClient';
import { getLogger } from '../utils/logger';

const log = getLogger('adminService');

export interface VerificationRequest {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: 'customer' | 'contractor' | 'admin';
    phone: string | null;
    verification_status: 'pending' | 'verified' | 'rejected';
    created_at: string;
  };
  id_photo_url: string;
  selfie_url: string;
  certificate_url?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  review_decision?: 'approved' | 'rejected' | null;
  review_reason?: string | null;
  reviewed_by?: string | null;
}

export interface AdminStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  totalToday: number;
}

export interface FetchVerificationsParams {
  role?: 'customer' | 'contractor' | 'admin';
  sort?: 'newest' | 'oldest';
  limit?: number;
  offset?: number;
}

/**
 * Admin service for managing verification requests.
 */
export class AdminService {
  /**
   * Fetch verification requests with optional filters.
   */
  static async getVerifications(
    params: FetchVerificationsParams = {}
  ): Promise<{ data: VerificationRequest[]; total: number }> {
    log.info('Fetching verifications', params);
    const response = await apiClient.get<{ data: VerificationRequest[]; total: number }>(
      '/admin/verifications',
      { params }
    );
    console.log('[FE2] - Fetched verifications:', response.data.total);
    return response.data;
  }

  /**
   * Approve a verification request.
   */
  static async approveVerification(id: string): Promise<void> {
    log.info('Approving verification', { id });
    await apiClient.post(`/admin/verifications/${id}/approve`);
    console.log('[FE2] - Approved verification:', id);
  }

  /**
   * Reject a verification request with a reason.
   */
  static async rejectVerification(id: string, reason: string): Promise<void> {
    log.info('Rejecting verification', { id, reason });
    await apiClient.post(`/admin/verifications/${id}/reject`, { reason });
    console.log('[FE2] - Rejected verification:', id);
  }

  /**
   * Get dashboard statistics.
   */
  static async getStats(): Promise<AdminStats> {
    log.info('Fetching admin stats');
    const response = await apiClient.get<AdminStats>('/admin/stats');
    console.log('[FE2] - Stats:', response.data);
    return response.data;
  }
}