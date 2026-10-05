// src/components/common/ToastContainer.tsx
import React from 'react';
import { useToastStore } from '../../stores/toastStore';
import styles from './ToastContainer.module.css';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
          onClick={() => removeToast(toast.id)}
          role="alert"
        >
          <span className={styles.message}>{toast.message}</span>
          <button
            className={styles.close}
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
            aria-label="Close notification"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};