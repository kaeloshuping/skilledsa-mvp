// src/pages/admin/AdminDashboard.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminService } from '../../services/adminService';
import type { AdminStats } from '../../services/adminService';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import styles from './AdminDashboard.module.css';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await AdminService.getStats();
      setStats(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to load stats';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, [fetchStats]);

  const handleLogout = async () => {
    console.log('[FE2] - Admin logout clicked');
    await logout();
    navigate('/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className={styles.layout}>
        <AdminSidebar />
        <div className={styles.content}>
          <div className={styles.loading}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <AdminSidebar />
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <div className={styles.headerActions}>
            <button className={styles.refreshButton} onClick={fetchStats}>
              🔄 Refresh
            </button>
            <button className={styles.logoutButton} onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </header>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats?.pending ?? 0}</span>
            <span className={styles.statLabel}>Pending Verifications</span>
            <Link to="/admin/verifications" className={styles.statLink}>View Queue →</Link>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats?.approvedToday ?? 0}</span>
            <span className={styles.statLabel}>Approved Today</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats?.rejectedToday ?? 0}</span>
            <span className={styles.statLabel}>Rejected Today</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{stats?.totalToday ?? 0}</span>
            <span className={styles.statLabel}>Total Processed Today</span>
          </div>
        </div>

        <div className={styles.quickActions}>
          <h2>Quick Actions</h2>
          <div className={styles.actionLinks}>
            <Link to="/admin/verifications" className={styles.actionCard}>
              <span className={styles.actionIcon}>✅</span>
              Review Verifications
            </Link>
            <Link to="/admin/users" className={styles.actionCard}>
              <span className={styles.actionIcon}>👥</span>
              Manage Users
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};