// src/components/dashboard/DashboardStats.tsx
import React from 'react';
import styles from './DashboardStats.module.css';

interface DashboardStatsProps {
  label: string;
  value: number;
  icon?: string;
  onClick?: () => void;
  hint?: string; // optional helper text when value is 0
}

/**
 * Reusable stat card component for dashboards.
 */
export const DashboardStats: React.FC<DashboardStatsProps> = ({
  label,
  value,
  icon,
  onClick,
  hint,
}) => {
  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <div
      className={`${styles.card} ${onClick ? styles.clickable : ''}`}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
      {value === 0 && hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
};