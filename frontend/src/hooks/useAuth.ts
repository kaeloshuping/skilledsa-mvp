// src/hooks/useAuth.ts
import { useAuthStore } from '../stores/authStore';
import { useMemo } from 'react';

/**
 * Custom hook that returns authentication state and actions.
 * Provides a cleaner API for components.
 */
export const useAuth = () => {
  const {
    user,
    accessToken,
    refreshToken,
    isLoading,
    error,
    signup,
    login,
    logout,
    refreshAccessToken,  // <-- RENAMED
    setTokens,
    clearTokens,
    setUser,
    clearError,
  } = useAuthStore();

  const isAuthenticated = !!user && !!accessToken;
  const isVerified = user?.verification_status === 'verified';

  return useMemo(
    () => ({
      user,
      accessToken,
      refreshToken,
      isLoading,
      error,
      isAuthenticated,
      isVerified,
      signup,
      login,
      logout,
      refreshAccessToken,  // <-- RENAMED
      setTokens,
      clearTokens,
      setUser,
      clearError,
    }),
    [
      user,
      accessToken,
      refreshToken,
      isLoading,
      error,
      isAuthenticated,
      isVerified,
      signup,
      login,
      logout,
      refreshAccessToken,
      setTokens,
      clearTokens,
      setUser,
      clearError,
    ]
  );
};