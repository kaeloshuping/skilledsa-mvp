// src/components/common/Toggle.tsx
import React from 'react';
import styles from './Toggle.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  helperText?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, disabled, helperText }) => {
  return (
    <div className={styles.toggleContainer}>
      <div className={styles.toggleRow}>
        <div
          className={`${styles.switch} ${checked ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
          onClick={() => !disabled && onChange(!checked)}
          role="button"
          tabIndex={0}
          aria-checked={checked}
          aria-disabled={disabled}
        >
          <div className={styles.knob} />
        </div>
        {label && <span className={styles.label}>{label}</span>}
      </div>
      {helperText && <p className={styles.helper}>{helperText}</p>}
    </div>
  );
};