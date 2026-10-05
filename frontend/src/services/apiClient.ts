// src/services/apiClient.ts
import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { getLogger } from '../utils/logger';
import { useAuthStore } from '../stores/authStore';

const log = getLogger('apiClient');

const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Authorization header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // --- FIX: Get token from the Zustand store instead of localStorage directly ---
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      // Fallback: try reading from localStorage directly (for backward compatibility)
      const legacyToken = localStorage.getItem('accessToken');
      if (legacyToken) {
        config.headers.Authorization = `Bearer ${legacyToken}`;
      }
    }
    console.log('[FE1] - API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('[FE1] - API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh (simplified)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // --- FIX: Get tokens from the Zustand store ---
      const { refreshToken, setTokens, clearTokens } = useAuthStore.getState();
      
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
            { refreshToken }
          );
          // Update the store with new tokens
          setTokens(data.accessToken, data.refreshToken);
          // Also update the request headers
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed – clear tokens and redirect to login
          clearTokens();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token – redirect to login
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;