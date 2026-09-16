// src/pages/admin/UserManagement.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { AdminService } from '../../services/adminService';
import type { AdminUser } from '../../services/adminService';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import styles from './UserManagement.module.css';

type RoleFilter = 'all' | 'customer' | 'contractor' | 'admin';
type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected';

const LIMIT = 20;

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const { showToast } = useToast();

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: {
        page: number;
        limit: number;
        role?: 'customer' | 'contractor' | 'admin';
        verificationStatus?: 'pending' | 'verified' | 'rejected';
        search?: string;
      } = { page, limit: LIMIT };

      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.verificationStatus = statusFilter;
      if (search.trim()) params.search = search.trim();

      const data = await AdminService.getUsers(params);
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (error: unknown) {
      console.error('[FE2] - Fetch users error', error);
      const err = error as { response?: { data?: { message?: string } } };
      showToast(err.response?.data?.message || 'Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, roleFilter, statusFilter, search, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  const handleRowClick = (user: AdminUser) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleVerify = async () => {
    if (!selectedUser) return;
    setIsVerifying(true);
    try {
      const updated = await AdminService.verifyUser(selectedUser.id);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setSelectedUser(updated);
      showToast(`User ${updated.full_name} verified ✅`, 'success');
      console.log('[FE2] - User verified:', updated.id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast(err.response?.data?.message || 'Failed to verify user', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value as RoleFilter);
    setPage(1);
  };
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as StatusFilter);
    setPage(1);
  };

  const statusBadgeClass = (status: AdminUser['verification_status']) => {
    switch (status) {
      case 'verified': return styles.badgeVerified;
      case 'rejected': return styles.badgeRejected;
      default: return styles.badgePending;
    }
  };

  return (
    <div className={styles.layout}>
      <AdminSidebar />
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>User Management</h1>
          <button className={styles.refreshButton} onClick={fetchUsers} disabled={isLoading}>
            🔄 {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="search">Search:</label>
            <input
              id="search"
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Name or email..."
              className={styles.input}
            />
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="roleFilter">Role:</label>
            <select id="roleFilter" value={roleFilter} onChange={handleRoleChange} className={styles.select}>
              <option value="all">All</option>
              <option value="customer">Customer</option>
              <option value="contractor">Contractor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label htmlFor="statusFilter">Verification:</label>
            <select id="statusFilter" value={statusFilter} onChange={handleStatusChange} className={styles.select}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <span className={styles.totalBadge}>Total: {total}</span>
        </div>

        {isLoading ? (
          <div className={styles.loading}>Loading users...</div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>No users match your filters.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verification</th>
                  <th>City</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} onClick={() => handleRowClick(u)} className={styles.row}>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td className={styles.capitalize}>{u.role}</td>
                    <td>
                      <span className={`${styles.badge} ${statusBadgeClass(u.verification_status)}`}>
                        {u.verification_status}
                      </span>
                    </td>
                    <td>{u.city || '—'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString('en-ZA')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageButton}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
            <button
              className={styles.pageButton}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="User Details">
        {selectedUser && (
          <div className={styles.modalBody}>
            <div className={styles.detailRow}><span>Name:</span><strong>{selectedUser.full_name}</strong></div>
            <div className={styles.detailRow}><span>Email:</span><strong>{selectedUser.email}</strong></div>
            <div className={styles.detailRow}><span>Role:</span><strong className={styles.capitalize}>{selectedUser.role}</strong></div>
            <div className={styles.detailRow}><span>Phone:</span><strong>{selectedUser.phone || '—'}</strong></div>
            <div className={styles.detailRow}><span>Address:</span><strong>{selectedUser.address || '—'}</strong></div>
            <div className={styles.detailRow}><span>City:</span><strong>{selectedUser.city || '—'}</strong></div>
            <div className={styles.detailRow}>
              <span>Verification:</span>
              <span className={`${styles.badge} ${statusBadgeClass(selectedUser.verification_status)}`}>
                {selectedUser.verification_status}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span>Joined:</span>
              <strong>{new Date(selectedUser.created_at).toLocaleString('en-ZA')}</strong>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={() => setIsModalOpen(false)}>Close</button>
              {selectedUser.verification_status !== 'verified' && (
                <button
                  className={styles.verifyButton}
                  onClick={handleVerify}
                  disabled={isVerifying}
                >
                  {isVerifying ? 'Verifying...' : '✅ Verify User'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};