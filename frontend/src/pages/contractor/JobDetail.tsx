// src/pages/contractor/JobDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { JobService, type ContractorJob } from '../../services/jobService';
import { useToast } from '../../hooks/useToast';
import styles from './JobDetail.module.css';

export const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<ContractorJob | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    if (!id) {
      navigate('/contractor/jobs');
      return;
    }

    const fetchJob = async () => {
      setLoading(true);
      try {
        const data = await JobService.getJobById(id);
        setJob(data);
        console.log('[FE2] - Job detail loaded', data);
      } catch (error) {
        console.error('[FE2] - Job detail error', error);
        showToast('Failed to load job details.', 'error');
        navigate('/contractor/jobs');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [id, navigate, showToast]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading job details...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>Job not found.</div>
      </div>
    );
  }

  const distanceText = job.distance !== undefined && job.distance !== null
    ? `${job.distance.toFixed(1)}km away`
    : 'Distance unknown';

  const statusBadgeClass = (() => {
    switch (job.status) {
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

  return (
    <div className={styles.container}>
      <button onClick={() => navigate('/contractor/jobs')} className={styles.backButton}>
        ← Back to jobs
      </button>

      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{job.title}</h1>
          <span className={`${styles.badge} ${statusBadgeClass}`}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </span>
        </div>

        <div className={styles.meta}>
          <span className={styles.trade}>{job.trade}</span>
          <span className={styles.distance}>{distanceText}</span>
          {job.customer.rating && (
            <span className={styles.rating}>⭐ {job.customer.rating.toFixed(1)}</span>
          )}
        </div>

        <div className={styles.description}>
          <h3>Description</h3>
          <p>{job.description}</p>
        </div>

        {job.photos && job.photos.length > 0 && (
          <div className={styles.photos}>
            <h3>Photos</h3>
            <div className={styles.photoGrid}>
              {job.photos.map((url, idx) => (
                <img key={idx} src={url} alt={`Job photo ${idx + 1}`} className={styles.photo} />
              ))}
            </div>
          </div>
        )}

        {job.location && (
          <div className={styles.location}>
            <h3>Location</h3>
            <p>{job.location.address || `${job.location.lat}, ${job.location.lng}`}</p>
            <p><strong>Travel fee accepted:</strong> {job.travelFeeAccepted ? 'Yes' : 'No'}</p>
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.quoteButton} onClick={() => alert('Submit Quote – Sprint 3')}>
            Submit Quote
          </button>
        </div>
      </div>
    </div>
  );
};