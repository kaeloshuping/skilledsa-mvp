// src/pages/VerificationPending.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './auth/Auth.module.css';

/**
 * Landing screen shown to a user whose verification request is pending review.
 *
 * The call-to-action is role-aware:
 *   - contractor -> their dashboard (jobs route is verification-gated, so
 *                   pointing them at /contractor/jobs would bounce them back)
 *   - customer   -> their dashboard (job posting is gated by an in-app modal)
 *   - admin      -> admin console
 *   - fallback   -> customer dashboard (auth store may still be rehydrating)
 */
export const VerificationPending: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const cta = (() => {
    switch (user?.role) {
      case 'contractor':
        return { label: 'Browse jobs while you wait', to: '/contractor/dashboard' };
      case 'admin':
        return { label: 'Go to admin dashboard', to: '/admin/dashboard' };
      case 'customer':
      default:
        return { label: 'Go to dashboard', to: '/dashboard' };
    }
  })();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verification Pending</h1>
        <p>
          We are verifying your identity. This usually takes within 24 hours.
          You'll be notified via email/SMS once approved.
        </p>
        <p><strong>Email:</strong> {user?.email}</p>
        <p><strong>Phone:</strong> {user?.phone || 'Not provided'}</p>
        <button
          className={styles.primaryButton}
          onClick={() => navigate(cta.to)}
        >
          {cta.label}
        </button>
      </div>
    </div>
  );
};