// src/components/admin/VerificationCard.tsx
import React, { useState } from 'react';
import type { VerificationRequest } from '../../services/adminService';
import { VerificationActions } from './VerificationActions';
import styles from './VerificationCard.module.css';

interface VerificationCardProps {
  request: VerificationRequest;
  onActionComplete: () => void;
}

/**
 * Card displaying a single verification request with user info and photos.
 */
export const VerificationCard: React.FC<VerificationCardProps> = ({
  request,
  onActionComplete,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const { user, id_photo_url, selfie_url, certificate_url, submitted_at } = request;
  const isContractor = user.role === 'contractor';

  const formattedDate = new Date(submitted_at).toLocaleString('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <h3 className={styles.name}>{user.full_name}</h3>
          <span className={styles.email}>{user.email}</span>
          <span className={styles.role}>
            {user.role === 'contractor' ? '🔧 Contractor' : '👤 Customer'}
          </span>
          <span className={styles.date}>Submitted: {formattedDate}</span>
        </div>
        <button
          className={styles.expandButton}
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Hide photos' : 'Show photos'}
        </button>
      </div>

      {isExpanded && (
        <div className={styles.photoSection}>
          <div className={styles.photoGrid}>
            <div className={styles.photoItem}>
              <p className={styles.photoLabel}>ID Photo</p>
              <img src={id_photo_url} alt="ID" className={styles.photo} />
            </div>
            <div className={styles.photoItem}>
              <p className={styles.photoLabel}>Selfie</p>
              <img src={selfie_url} alt="Selfie" className={styles.photo} />
            </div>
            {isContractor && certificate_url && (
              <div className={styles.photoItem}>
                <p className={styles.photoLabel}>Certificate</p>
                {certificate_url.endsWith('.pdf') ? (
                  <a href={certificate_url} target="_blank" rel="noopener noreferrer">
                    View PDF
                  </a>
                ) : (
                  <img src={certificate_url} alt="Certificate" className={styles.photo} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <VerificationActions
          verificationId={request.id}
          onActionComplete={onActionComplete}
        />
      </div>
    </div>
  );
};