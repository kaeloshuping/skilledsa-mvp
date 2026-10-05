// src/components/jobs/JobCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './JobCard.module.css';

export interface JobCardProps {
  id: string;
  title: string;
  trade: string;
  status: string;
  quoteCount: number;
  createdAt: string;
}

const statusColorMap: Record<string, string> = {
  open: '#2E8B57',      // green
  active: '#1A5F7A',    // primary blue
  completed: '#2E8B57', // green
  cancelled: '#C0392B', // red
  disputed: '#E67E22',  // orange
};

export const JobCard: React.FC<JobCardProps> = ({ id, title, trade, status, quoteCount, createdAt }) => {
  const navigate = useNavigate();

  const formattedDate = new Date(createdAt).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className={styles.card} onClick={() => navigate(`/jobs/${id}`)}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <span className={styles.status} style={{ backgroundColor: statusColorMap[status] || '#7F8C8D' }}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
      <div className={styles.meta}>
        <span className={styles.trade}>{trade}</span>
        <span className={styles.quotes}>💬 {quoteCount} quote{quoteCount !== 1 ? 's' : ''}</span>
        <span className={styles.date}>{formattedDate}</span>
      </div>
    </div>
  );
};