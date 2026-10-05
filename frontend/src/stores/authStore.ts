// src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthService } from '../services/authService';
import type { SignupData, LoginData } from '../services/authService';

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface BankDetails {
  bank_name?: string;
  account_number?: string;
  branch_code?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  address?: string | null;
  city?: string | null;
  travel_fee_per_km?: number | null;
  last_travel_fee_change?: string | null;
  bank_details?: BankDetails | null;
  notification_preference?: NotificationPreferences | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface ApiErrorBody {
  message?: string;
  error?: string;
  errors?: Array<{ msg?: string; message?: string }>;
  issues?: Array<{ message?: string }>;
  details?: Array<string | { message?: string; msg?: string }>;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  signup: (data: SignupData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  if (!isRecord(error)) return fallback;

  const response = error.response;
  if (!isRecord(response)) return fallback;
  const data = response.data;
  if (!isRecord(data)) return fallback;

  const apiError = data as ApiErrorBody;

  if (Array.isArray(apiError.details) && apiError.details.length > 0) {
    const messages: string[] = [];
    for (const detail of apiError.details) {
      if (typeof detail === 'string') messages.push(detail);
      else if (isRecord(detail)) {
        if (typeof detail.message === 'string') messages.push(detail.message);
        else if (typeof detail.msg === 'string') messages.push(detail.msg);
      }
    }
    if (messages.length > 0) {
      const prefix = typeof apiError.error === 'string' ? apiError.error : 'Validation failed';
      return `${prefix}: ${messages.join('; ')}`;
    }
  }

  if (typeof apiError.message === 'string') return apiError.message;
  if (typeof apiError.error === 'string') return apiError.error;

  if (Array.isArray(apiError.errors) && apiError.errors.length > 0) {
    const msgs = apiError.errors
      .map((e) => (isRecord(e) && typeof e.msg === 'string' ? e.msg : ''))
      .filter((m) => m.length > 0);
    if (msgs.length > 0) return msgs.join(', ');
  }

  if (Array.isArray(apiError.issues) && apiError.issues.length > 0) {
    const msgs = apiError.issues
      .map((e) => (isRecord(e) && typeof e.message === 'string' ? e.message : ''))
      .filter((m) => m.length > 0);
    if (msgs.length > 0) return msgs.join(', ');
  }

  try {
    return JSON.stringify(data).slice(0, 200);
  } catch {
    return fallback;
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      signup: async (data: SignupData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await AuthService.signup(data);
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isLoading: false,
          });
          console.log('[FE2] - Store updated after signup');
        } catch (error) {
          console.error('[FE2] - Signup full error:', error);
          const message = extractErrorMessage(error, 'Signup failed. Please try again.');
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      login: async (data: LoginData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await AuthService.login(data);
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isLoading: false,
          });
          console.log('[FE2] - Store updated after login');
        } catch (error) {
          console.error('[FE2] - Login full error:', error);
          const message = extractErrorMessage(error, 'Login failed. Please try again.');
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { refreshToken } = get();
        if (refreshToken) {
          try {
            await AuthService.logout(refreshToken);
          } catch (error) {
            console.warn('[FE2] - Logout API error, continuing cleanup', error);
          }
        }
        set({ user: null, accessToken: null, refreshToken: null });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        console.log('[FE2] - Store cleared after logout');
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          set({ error: 'No refresh token available' });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const response = await AuthService.refresh(refreshToken);
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isLoading: false,
          });
          console.log('[FE2] - Store updated after token refresh');
        } catch (error) {
          console.error('[FE2] - Refresh full error:', error);
          const message = extractErrorMessage(error, 'Refresh failed. Please try again.');
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },

      clearTokens: () => {
        set({ accessToken: null, refreshToken: null });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      },

      setUser: (user: User) => {
        set({ user });
        console.log('[FE2] - User set manually');
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);