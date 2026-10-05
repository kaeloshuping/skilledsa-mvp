// src/pages/auth/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Auth.module.css';
import { getLogger } from '../../utils/logger';

const log = getLogger('Login');

interface LoginProps {
  redirectTo?: string;
}

export const Login: React.FC<LoginProps> = ({ redirectTo = '/dashboard' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Use the provided redirectTo or the 'from' state, default to '/dashboard'
  const from = (location.state as { from?: string })?.from || redirectTo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Email and password are required');
      return;
    }

    console.log('[FE1] - Login submitted', { email });

    try {
      await login({ email, password });
      navigate(from, { replace: true });
      log.info('Login successful, redirecting to', from);
    } catch (err) {
      console.error('[FE1] - Login error', err);
    }
  };

  const signupPath = location.pathname.startsWith('/admin') ? '/admin/signup' : '/signup';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>
          {location.pathname.startsWith('/admin') ? 'Admin' : ''} Log in to your SkilledSA account
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

          <div className={styles.field}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.forgotLink}>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          {(error || localError) && (
            <div className={styles.errorMessage}>
              {error || localError}
            </div>
          )}

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>

          <p className={styles.footer}>
            Don't have an account? <Link to={signupPath}>Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
};