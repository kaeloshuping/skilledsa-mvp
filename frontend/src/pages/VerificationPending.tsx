// src/pages/VerificationPending.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import styles from './auth/Auth.module.css';   

export const VerificationPending: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
          onClick={() => navigate('/')}
        >
          Browse jobs while you wait
        </button>
      </div>
    </div>
  );
};