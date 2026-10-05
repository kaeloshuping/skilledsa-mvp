// src/components/dashboard/VerificationBanner.tsx
import React from 'react';
import styles from './VerificationBanner.module.css';

type VerificationStatus = 'pending' | 'verified' | 'rejected';

interface VerificationBannerProps {
  status: VerificationStatus;
  onVerifyClick: () => void;
}

/**
 * Status-based banner for verification prompts.
 */
export const VerificationBanner: React.FC<VerificationBannerProps> = ({
  status,
  onVerifyClick,
}) => {
  if (status === 'verified') {
    return (
      <div className={`${styles.banner} ${styles.verified}`}>
        <span className={styles.icon}>✅</span>
        <span className={styles.message}>Your account is verified. You can apply for jobs.</span>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className={`${styles.banner} ${styles.pending}`}>
        <span className={styles.icon}>⏳</span>
        <span className={styles.message}>
          Your verification is in progress. You will be notified once approved.
        </span>
      </div>
    );
  }

  // status === 'rejected' or any other
  return (
    <div className={`${styles.banner} ${styles.rejected}`}>
      <span className={styles.icon}>⚠️</span>
      <span className={styles.message}>
        Complete your verification to apply for jobs and start earning.
      </span>
      <button className={styles.verifyButton} onClick={onVerifyClick}>
        Verify Now
      </button>
    </div>
  );
};