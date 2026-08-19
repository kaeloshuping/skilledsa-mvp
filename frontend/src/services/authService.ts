// src/services/authService.ts
import apiClient from './apiClient';
import { getLogger } from '../utils/logger';

const log = getLogger('authService');

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

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    phone: string | null;
    verification_status: 'pending' | 'verified' | 'rejected';
    is_active: boolean;
    last_login: string | null;
    created_at: string;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication service for all auth-related API calls.
 */
export class AuthService {
  /**
   * Register a new user.
   */
  static async signup(data: SignupData): Promise<AuthResponse> {
    log.info('Signup request', { email: data.email, role: data.role });
    const response = await apiClient.post<AuthResponse>('/auth/signup', data);
    console.log('[FE1] - Signup successful', response.data.user.email);
    return response.data;
  }

  /**
   * Login user.
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    log.info('Login request', { email: data.email });
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    console.log('[FE1] - Login successful', response.data.user.email);
    return response.data;
  }

  /**
   * Refresh access token using refresh token.
   */
  static async refresh(refreshToken: string): Promise<AuthResponse> {
    log.info('Refresh token request');
    const response = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken });
    console.log('[FE1] - Token refresh successful');
    return response.data;
  }

  /**
   * Logout – revoke refresh token.
   */
  static async logout(refreshToken: string): Promise<void> {
    log.info('Logout request');
    await apiClient.post('/auth/logout', { refreshToken });
    console.log('[FE1] - Logout successful');
  }

  /**
   * Get current user info.
   */
  static async getMe(): Promise<AuthResponse['user']> {
    log.info('Get me request');
    const response = await apiClient.get<{ user: AuthResponse['user'] }>('/auth/me');
    console.log('[FE1] - Get me successful');
    return response.data.user;
  }
}