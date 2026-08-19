// src/components/admin/AdminSidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './AdminSidebar.module.css';

export const AdminSidebar: React.FC = () => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span>SkilledSA</span>
        <small>Admin</small>
      </div>
      <nav className={styles.nav}>
        <NavLink
          to="/admin/dashboard"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          📊 Dashboard
        </NavLink>
        <NavLink
          to="/admin/verifications"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          ✅ Verification Queue
        </NavLink>
        <NavLink
          to="/admin/users"
          className={({ isActive }) =>
            isActive ? `${styles.link} ${styles.active}` : styles.link
          }
        >
          👥 User Management
        </NavLink>
      </nav>
    </aside>
  );
};