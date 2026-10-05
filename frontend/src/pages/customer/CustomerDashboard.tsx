// src/pages/customer/CustomerDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { JobService } from '../../services/jobService';
import type { JobStats, JobSummary } from '../../services/jobService';
import { JobCard } from '../../components/jobs/JobCard';
import { useToast } from '../../stores/toastStore';
import styles from './CustomerDashboard.module.css';

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stats, setStats] = useState<JobStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [statsData, jobsData] = await Promise.all([
          JobService.getJobStats(user.id),
          JobService.getJobs(user.id, 5),
        ]);
        setStats(statsData);
        setRecentJobs(jobsData);
      } catch (err: unknown) {
        console.error('[FE1] - Dashboard fetch error', err);
        let message = 'Failed to load dashboard data.';
        if (err && typeof err === 'object' && 'response' in err) {
          const response = err.response;
          if (response && typeof response === 'object' && 'data' in response) {
            const data = response.data;
            if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
              message = data.message;
            }
          }
        } else if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
        showToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, showToast]);

  const handleStatClick = (status: 'open' | 'active' | 'completed') => {
    navigate(`/dashboard?filter=${status}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const isVerified = user?.verification_status === 'verified';

  return (
    <div className={styles.container}>
      {/* Verification Banner */}
      {!isVerified && (
        <div className={styles.verificationBanner}>
          <span>⚠️ Complete your verification to post jobs and receive quotes.</span>
          <button
            className={styles.verifyButton}
            onClick={() => navigate('/verify')}
          >
            Verify Now
          </button>
        </div>
      )}

      {isVerified && (
        <div className={styles.verifiedBadge}>
          ✅ Verified Account
        </div>
      )}

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard} onClick={() => handleStatClick('open')}>
          <span className={styles.statNumber}>{stats?.posted ?? 0}</span>
          <span className={styles.statLabel}>Posted Jobs</span>
          {stats?.posted === 0 && <span className={styles.statHint}>Start posting today</span>}
        </div>
        <div className={styles.statCard} onClick={() => handleStatClick('active')}>
          <span className={styles.statNumber}>{stats?.active ?? 0}</span>
          <span className={styles.statLabel}>Active Jobs</span>
          {stats?.active === 0 && <span className={styles.statHint}>No active jobs</span>}
        </div>
        <div className={styles.statCard} onClick={() => handleStatClick('completed')}>
          <span className={styles.statNumber}>{stats?.completed ?? 0}</span>
          <span className={styles.statLabel}>Completed Jobs</span>
          {stats?.completed === 0 && <span className={styles.statHint}>Complete a job to see it here</span>}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button
          className={styles.primaryButton}
          onClick={() => navigate('/post-job')}
          disabled={!isVerified}
          title={!isVerified ? 'You must verify your account to post a job' : ''}
        >
          ➕ Post a Job
        </button>
        <button
          className={styles.secondaryButton}
          onClick={() => navigate('/contractors')}
        >
          🔍 Browse Contractors
        </button>
      </div>

      {/* Recent Jobs */}
      <section className={styles.recentJobs}>
        <div className={styles.sectionHeader}>
          <h2>Recent Jobs</h2>
          {recentJobs.length > 0 && (
            <button className={styles.viewAllButton} onClick={() => navigate('/jobs')}>
              View All
            </button>
          )}
        </div>

        {recentJobs.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <p>You haven't posted any jobs yet.</p>
            <p className={styles.emptySubtext}>Get started by posting your first job!</p>
            <button
              className={styles.primaryButton}
              onClick={() => navigate('/post-job')}
              disabled={!isVerified}
              title={!isVerified ? 'You must verify your account to post a job' : ''}
            >
              Post a Job
            </button>
          </div>
        ) : (
          <div className={styles.jobList}>
            {recentJobs.map((job) => (
              <JobCard
                key={job.id}
                id={job.id}
                title={job.title}
                trade={job.trade}
                status={job.status}
                quoteCount={job.quoteCount}
                createdAt={job.createdAt}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};