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

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'customer' | 'contractor' | 'admin';
  phone: string | null;
  address: string | null;
  city: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  role?: 'customer' | 'contractor' | 'admin';
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  search?: string;
}

export interface ListUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AdminService {
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

  static async approveVerification(id: string): Promise<void> {
    log.info('Approving verification', { id });
    await apiClient.post(`/admin/verifications/${id}/approve`);
    console.log('[FE2] - Approved verification:', id);
  }

  static async rejectVerification(id: string, reason: string): Promise<void> {
    log.info('Rejecting verification', { id, reason });
    await apiClient.post(`/admin/verifications/${id}/reject`, { reason });
    console.log('[FE2] - Rejected verification:', id);
  }

  static async getStats(): Promise<AdminStats> {
    log.info('Fetching admin stats');
    const response = await apiClient.get<AdminStats>('/admin/stats');
    console.log('[FE2] - Stats:', response.data);
    return response.data;
  }

  static async getUsers(params: ListUsersParams = {}): Promise<ListUsersResponse> {
    log.info('Fetching admin users', params);
    const response = await apiClient.get<ListUsersResponse>('/admin/users', { params });
    console.log('[FE2] - Fetched users:', response.data.users.length, 'of', response.data.total);
    return response.data;
  }

  /**
   * Verify a user's account.
   * Requires backend endpoint: POST /admin/users/:id/verify (see BE1 notes).
   */
  static async verifyUser(id: string): Promise<AdminUser> {
    log.info('Verifying user', { id });
    const response = await apiClient.post<{ user: AdminUser }>(`/admin/users/${id}/verify`);
    console.log('[FE2] - Verified user:', response.data.user.id);
    return response.data.user;
  }
}