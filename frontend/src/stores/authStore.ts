// src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthService } from '../services/authService';
import type { AuthResponse, SignupData, LoginData } from '../services/authService';
import { getLogger } from '../utils/logger';

const log = getLogger('authStore');

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  signup: (data: SignupData) => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
}

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
          console.log('[FE1] - Store updated after signup');
        } catch (error) {
          console.error('[FE1] - Signup full error:', error);
          let message = 'Signup failed. Please try again.';

          if (error && typeof error === 'object' && 'response' in error) {
            const response = (error as any).response;
            if (response?.data) {
              const data = response.data;
              console.error('[FE1] - Signup response data:', data);

              // --- START FIX: Concatenate validation details ---
              // If the response has an 'error' field and a 'details' array (from Zod),
              // build a user-friendly message from the details.
              if (data.details && Array.isArray(data.details) && data.details.length > 0) {
                // Extract specific validation messages (e.g., "Password must contain at least one uppercase letter")
                const detailMessages = data.details
                  .map((d: any) => d.message || d.msg || d)
                  .join('; ');
                message = `${data.error || 'Validation failed'}: ${detailMessages}`;
              } else if (data.message) {
                message = data.message;
              } else if (data.error) {
                message = data.error;
              } else if (data.errors && Array.isArray(data.errors)) {
                // Fallback for other validation formats
                message = data.errors.map((e: any) => e.msg || e.message || e).join(', ');
              } else if (data.issues && Array.isArray(data.issues)) {
                message = data.issues.map((e: any) => e.message).join(', ');
              } else {
                // Fallback: show full response as string (but limit length)
                message = JSON.stringify(data).slice(0, 200);
              }
              // --- END FIX ---
            }
          }

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
          console.log('[FE1] - Store updated after login');
        } catch (error) {
          console.error('[FE1] - Login full error:', error);
          let message = 'Login failed. Please try again.';

          if (error && typeof error === 'object' && 'response' in error) {
            const response = (error as any).response;
            if (response?.data) {
              const data = response.data;
              console.error('[FE1] - Login response data:', data);

              // --- START FIX: Same improvement for login (though not strictly needed, keep consistent) ---
              if (data.details && Array.isArray(data.details) && data.details.length > 0) {
                const detailMessages = data.details
                  .map((d: any) => d.message || d.msg || d)
                  .join('; ');
                message = `${data.error || 'Validation failed'}: ${detailMessages}`;
              } else if (data.message) {
                message = data.message;
              } else if (data.error) {
                message = data.error;
              } else if (data.errors && Array.isArray(data.errors)) {
                message = data.errors.map((e: any) => e.msg || e.message || e).join(', ');
              } else if (data.issues && Array.isArray(data.issues)) {
                message = data.issues.map((e: any) => e.message).join(', ');
              } else {
                message = JSON.stringify(data).slice(0, 200);
              }
              // --- END FIX ---
            }
          }

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
            console.warn('[FE1] - Logout API error, continuing cleanup', error);
          }
        }
        set({ user: null, accessToken: null, refreshToken: null });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        console.log('[FE1] - Store cleared after logout');
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
          console.log('[FE1] - Store updated after token refresh');
        } catch (error) {
          console.error('[FE1] - Refresh full error:', error);
          let message = 'Refresh failed. Please try again.';

          if (error && typeof error === 'object' && 'response' in error) {
            const response = (error as any).response;
            if (response?.data) {
              const data = response.data;
              console.error('[FE1] - Refresh response data:', data);

              // --- START FIX: Same improvement for refresh (optional) ---
              if (data.details && Array.isArray(data.details) && data.details.length > 0) {
                const detailMessages = data.details
                  .map((d: any) => d.message || d.msg || d)
                  .join('; ');
                message = `${data.error || 'Validation failed'}: ${detailMessages}`;
              } else if (data.message) {
                message = data.message;
              } else if (data.error) {
                message = data.error;
              } else if (data.errors && Array.isArray(data.errors)) {
                message = data.errors.map((e: any) => e.msg || e.message || e).join(', ');
              } else if (data.issues && Array.isArray(data.issues)) {
                message = data.issues.map((e: any) => e.message).join(', ');
              } else {
                message = JSON.stringify(data).slice(0, 200);
              }
              // --- END FIX ---
            }
          }

          set({ error: message, isLoading: false });
          throw error;
        }
      },

      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
        console.log('[FE1] - Tokens set manually');
      },

      clearTokens: () => {
        set({ accessToken: null, refreshToken: null });
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        console.log('[FE1] - Tokens cleared');
      },

      setUser: (user: User) => {
        set({ user });
        console.log('[FE1] - User set manually');
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