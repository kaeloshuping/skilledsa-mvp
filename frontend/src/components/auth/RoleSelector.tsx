// src/components/auth/RoleSelector.tsx
import React from 'react';
import styles from './RoleSelector.module.css';

export type Role = 'customer' | 'contractor' | 'admin';

interface RoleSelectorProps {
  selectedRole: Role | null;
  onChange: (role: Role) => void;
  error?: string;
  allowedRoles?: Role[]; // NEW: restrict which roles are shown
}

const allRoles: { value: Role; label: string; icon: string; description: string }[] = [
  {
    value: 'customer',
    label: 'Customer',
    icon: '👤',
    description: 'Hire contractors for your projects',
  },
  {
    value: 'contractor',
    label: 'Contractor',
    icon: '🔧',
    description: 'Offer your services and get hired',
  },
  {
    value: 'admin',
    label: 'Admin',
    icon: '🛠️',
    description: 'Manage the platform (internal)',
  },
];

/**
 * RoleSelector displays clickable cards for role selection.
 */
export const RoleSelector: React.FC<RoleSelectorProps> = ({
  selectedRole,
  onChange,
  error,
  allowedRoles = ['customer', 'contractor', 'admin'], // default all
}) => {
  const roles = allRoles.filter(role => allowedRoles.includes(role.value));
  console.log('[FE1] - RoleSelector rendered', { selectedRole, allowedRoles });

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {roles.map((role) => (
          <button
            key={role.value}
            className={`${styles.card} ${selectedRole === role.value ? styles.selected : ''}`}
            onClick={() => onChange(role.value)}
            type="button"
            aria-pressed={selectedRole === role.value}
          >
            <span className={styles.icon}>{role.icon}</span>
            <span className={styles.label}>{role.label}</span>
            <span className={styles.description}>{role.description}</span>
          </button>
        ))}
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};