// src/pages/admin/VerificationQueue.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { AdminService } from '../../services/adminService';
import type { VerificationRequest } from '../../services/adminService';
import { VerificationCard } from '../../components/admin/VerificationCard';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { useToast } from '../../hooks/useToast';
import styles from './VerificationQueue.module.css';

type FilterRole = 'all' | 'customer' | 'contractor';
type SortOrder = 'newest' | 'oldest';

export const VerificationQueue: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const { showToast } = useToast();

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: {
        role?: 'customer' | 'contractor';
        sort?: 'newest' | 'oldest';
      } = { sort: sortOrder };

      if (filterRole !== 'all') {
        params.role = filterRole;
      }

      const { data, total } = await AdminService.getVerifications(params);
      setRequests(data);
      setTotal(total);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const msg = err.response?.data?.message || 'Failed to load verifications';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filterRole, sortOrder, showToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleActionComplete = () => {
    fetchRequests();
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as FilterRole;
    setFilterRole(value);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as SortOrder;
    setSortOrder(value);
  };

  return (
    <div className={styles.layout}>
      <AdminSidebar />
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Verification Queue</h1>
          <button className={styles.refreshButton} onClick={fetchRequests} disabled={isLoading}>
            🔄 {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="roleFilter">Role:</label>
            <select
              id="roleFilter"
              value={filterRole}
              onChange={handleFilterChange}
              className={styles.select}
            >
              <option value="all">All</option>
              <option value="customer">Customer</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="sortOrder">Sort:</label>
            <select
              id="sortOrder"
              value={sortOrder}
              onChange={handleSortChange}
              className={styles.select}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          <span className={styles.totalBadge}>Total: {total}</span>
        </div>

        {isLoading ? (
          <div className={styles.loading}>Loading verifications...</div>
        ) : requests.length === 0 ? (
          <div className={styles.empty}>No pending verifications.</div>
        ) : (
          <div className={styles.list}>
            {requests.map((req) => (
              <VerificationCard
                key={req.id}
                request={req}
                onActionComplete={handleActionComplete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};