// src/pages/contractor/ContractorDashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { JobService, type ContractorJob, type City } from '../../services/jobService';
import { DashboardStats } from '../../components/dashboard/DashboardStats';
import { VerificationBanner } from '../../components/dashboard/VerificationBanner';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { BrowseJobCard } from '../../components/jobs/BrowseJobCard';
import { useToast } from '../../hooks/useToast';
import styles from './ContractorDashboard.module.css';

export const ContractorDashboard: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stats, setStats] = useState<{ available: number; active: number; completed: number } | null>(null);
  const [recommendedJobs, setRecommendedJobs] = useState<ContractorJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user && user.role !== 'contractor') {
      if (user.role === 'customer') navigate('/dashboard');
      else if (user.role === 'admin') navigate('/admin/dashboard');
      else navigate('/');
    }
  }, [user, isLoading, navigate]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const trade = (user as { trade?: string }).trade || 'Plumbing';
    const city: City = (user.city as City) || 'all';

    try {
      const [statsData, jobsResponse] = await Promise.all([
        JobService.getContractorStats(user.id, trade, city),
        JobService.getAvailableJobs({ trade, city, limit: 5, page: 1 }),
      ]);
      setStats(statsData);
      setRecommendedJobs(jobsResponse.data);
      console.log('[FE2] - Contractor dashboard data loaded');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        console.warn('[FE2] - Contractor stats endpoint not yet implemented');
        setStats({ available: 0, active: 0, completed: 0 });
        setRecommendedJobs([]);
      } else {
        console.error('[FE2] - Dashboard fetch error', err);
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data.';
        setError(message);
        showToast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) fetchDashboardData();
  }, [user, fetchDashboardData]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [user, fetchDashboardData]);

  const handleLogout = async () => {
    console.log('[FE2] - Contractor logout clicked');
    await logout();
    navigate('/login', { replace: true });
  };

  const handleVerifyNow = () => navigate('/verify');
  const handleBrowseJobs = () => navigate('/contractor/jobs');
  const handleViewAllJobs = () => navigate('/contractor/jobs');
  const handleProfile = () => navigate('/contractor/profile');

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
  const hasCity = !!(user?.city && user.city.trim().length > 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.brand}>SkilledSA</span>
        <div className={styles.headerMenu}>
          <button className={styles.menuButton} onClick={handleProfile} title="View profile">
            👤 Profile
          </button>
          <button className={styles.menuButton} onClick={handleLogout} title="Log out">
            🚪 Logout
          </button>
        </div>
      </header>

      <VerificationBanner
        status={user?.verification_status || 'pending'}
        onVerifyClick={handleVerifyNow}
      />

      {!hasCity && (
        <div className={styles.cityPrompt}>
          <span>📍 Set your city to see relevant jobs near you.</span>
          <button className={styles.cityPromptButton} onClick={handleProfile}>
            Set City
          </button>
        </div>
      )}

      <div className={styles.statsGrid}>
        <DashboardStats
          label="Available Jobs"
          value={stats?.available ?? 0}
          icon="🔍"
          onClick={handleBrowseJobs}
          hint={stats?.available === 0 ? 'No new jobs right now' : undefined}
        />
        <DashboardStats
          label="Active Jobs"
          value={stats?.active ?? 0}
          icon="⚡"
          hint={stats?.active === 0 ? 'No active jobs' : undefined}
        />
        <DashboardStats
          label="Completed Jobs"
          value={stats?.completed ?? 0}
          icon="✅"
          hint={stats?.completed === 0 ? 'Complete a job to see it here' : undefined}
        />
      </div>

      <div className={styles.quickActions}>
        <button
          className={styles.primaryButton}
          onClick={handleBrowseJobs}
          disabled={!isVerified}
          title={!isVerified ? 'Verify your account to browse jobs' : ''}
        >
          🔍 Browse Jobs
        </button>
        <button className={styles.secondaryButton} onClick={handleProfile}>
          📁 My Profile
        </button>
      </div>

      <section className={styles.recommendedJobs}>
        <div className={styles.sectionHeader}>
          <h2>Recommended Jobs</h2>
          {recommendedJobs.length > 0 && (
            <button className={styles.viewAllButton} onClick={handleViewAllJobs}>
              View All Jobs
            </button>
          )}
        </div>

        {recommendedJobs.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No jobs match your trade and location right now"
            description="Check back later! New jobs are posted regularly."
            actionLabel="Browse All Jobs"
            onAction={handleViewAllJobs}
          />
        ) : (
          <div className={styles.jobList}>
            {recommendedJobs.map((job) => (
              <BrowseJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};