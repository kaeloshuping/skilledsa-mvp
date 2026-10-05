// src/services/authService.ts
import apiClient from './apiClient';
import { getLogger } from '../utils/logger';

const log = getLogger('authService');

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface SignupData {
  email: string;
  password: string;
  full_name: string;
  role: 'customer' | 'contractor' | 'admin';
  phone?: string;
  popia_consent: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

/**
 * Matches the backend `updateMeSchema` (camelCase fields).
 */
export interface UpdateProfileData {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  travelFeePerKm?: number;
  notificationPrefs?: NotificationPreferences;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    phone: string | null;
    address?: string | null;
    city?: string | null;
    travel_fee_per_km?: number | null;
    last_travel_fee_change?: string | null;
    bank_details?: {
      bank_name?: string;
      account_number?: string;
      branch_code?: string;
    } | null;
    notification_preference?: NotificationPreferences | null;
    verification_status: 'pending' | 'verified' | 'rejected';
    is_active: boolean;
    last_login: string | null;
    created_at: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  static async signup(data: SignupData): Promise<AuthResponse> {
    log.info('Signup request', { email: data.email, role: data.role });
    const response = await apiClient.post<AuthResponse>('/auth/signup', data);
    console.log('[FE2] - Signup successful', response.data.user.email);
    return response.data;
  }

  static async login(data: LoginData): Promise<AuthResponse> {
    log.info('Login request', { email: data.email });
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    console.log('[FE2] - Login successful', response.data.user.email);
    return response.data;
  }

  static async refresh(refreshToken: string): Promise<AuthResponse> {
    log.info('Refresh token request');
    const response = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken });
    console.log('[FE2] - Token refresh successful');
    return response.data;
  }

  static async logout(refreshToken: string): Promise<void> {
    log.info('Logout request');
    await apiClient.post('/auth/logout', { refreshToken });
    console.log('[FE2] - Logout successful');
  }

  static async getMe(): Promise<AuthResponse['user']> {
    log.info('Get me request');
    const response = await apiClient.get<{ user: AuthResponse['user'] }>('/auth/me');
    console.log('[FE2] - Get me successful');
    return response.data.user;
  }

  static async updateProfile(data: UpdateProfileData): Promise<AuthResponse['user']> {
    log.info('Update profile request', data);
    const response = await apiClient.put<{ user: AuthResponse['user'] }>('/users/me', data);
    console.log('[FE2] - Profile updated successfully');
    return response.data.user;
  }
}