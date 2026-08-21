// src/pages/auth/Login.tsx
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './Auth.module.css';
import { getLogger } from '../../utils/logger';

const log = getLogger('Login');

interface LoginProps {
  redirectTo?: string; // Where to redirect after successful login (overridden by location.state.from)
}

export const Login: React.FC<LoginProps> = ({ redirectTo = '/' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Determine the destination: use location.state.from if available, else fallback to redirectTo
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

      // After login, determine the final destination
      let destination = from;

      // If no explicit destination (from state or redirectTo) and we have a user,
      // redirect based on role (for /login page with no specific target)
      if ((!from || from === '/') && user) {
        if (user.role === 'admin') {
          destination = '/admin/dashboard';
        } else if (user.role === 'customer' || user.role === 'contractor') {
          destination = '/dashboard';
        } else {
          destination = '/';
        }
      }

      navigate(destination, { replace: true });
      log.info('Login successful, redirecting to', destination);
    } catch (err) {
      console.error('[FE1] - Login error', err);
    }
  };

  // ... rest of the component (JSX) unchanged ...
  // Ensure the signup link is dynamic based on path
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