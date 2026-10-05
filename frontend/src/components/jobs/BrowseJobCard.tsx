// src/components/jobs/BrowseJobCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import type { ContractorJob } from '../../services/jobService';
import styles from './BrowseJobCard.module.css';

interface BrowseJobCardProps {
  job: ContractorJob;
}

/**
 * Job card for contractor browsing (matches UI spec Section 2.4).
 */
export const BrowseJobCard: React.FC<BrowseJobCardProps> = ({ job }) => {
  const { id, title, trade, distance, status, photos, customer } = job;

  const distanceText = distance !== undefined && distance !== null
    ? `${distance.toFixed(1)}km away`
    : 'Distance unknown';

  const statusBadgeClass = (() => {
    switch (status) {
      case 'open':
        return styles.badgeOpen;
      case 'accepted':
        return styles.badgeAccepted;
      case 'completed':
        return styles.badgeCompleted;
      case 'disputed':
        return styles.badgeDisputed;
      default:
        return styles.badgeDefault;
    }
  })();

  const thumbnail = photos && photos.length > 0
    ? photos[0]
    : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23D5CFC0" width="100" height="100"/%3E%3Ctext x="50" y="55" font-family="Arial" font-size="14" text-anchor="middle" fill="%237F8C8D"%3ENo image%3C/text%3E%3C/svg%3E';

  return (
    <Link to={`/contractor/jobs/${id}`} className={styles.cardLink}>
      <div className={styles.card}>
        <img src={thumbnail} alt={title} className={styles.thumbnail} />
        <div className={styles.content}>
          <h3 className={styles.title}>{title}</h3>
          <div className={styles.meta}>
            <span className={styles.trade}>{trade}</span>
            <span className={styles.distance}>{distanceText}</span>
          </div>
          <div className={styles.footer}>
            <span className={`${styles.badge} ${statusBadgeClass}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
            {customer.rating && (
              <span className={styles.rating}>⭐ {customer.rating.toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};