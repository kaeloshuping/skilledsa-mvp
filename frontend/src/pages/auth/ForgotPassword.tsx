// src/pages/auth/ForgotPassword.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './Auth.module.css';
import { getLogger } from '../../utils/logger';

const log = getLogger('ForgotPassword');

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);
    console.log('[FE1] - Forgot password requested', { email });

    try {
      // Placeholder: backend not implemented yet, just simulate
      // In the future: await AuthService.forgotPassword(email);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmitted(true);
      log.info('Password reset email sent (simulated)');
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
      console.error('[FE1] - Forgot password error', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            If an account exists for {email}, we've sent a password reset link.
          </p>
          <Link to="/login" className={styles.primaryButton}>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>
          Enter your email and we'll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
              disabled={isLoading}
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <p className={styles.footer}>
            Remember your password? <Link to="/login">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};