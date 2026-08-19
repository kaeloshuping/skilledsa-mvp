// src/hooks/useToast.ts
import { useToastStore } from '../stores/toastStore';

/**
 * Custom hook that provides toast notification functions.
 * Re-exports from the toast store for easier consumption.
 */
export const useToast = () => {
  const { showToast, removeToast } = useToastStore();
  return { showToast, removeToast };
};