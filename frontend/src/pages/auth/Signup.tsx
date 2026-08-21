// src/pages/auth/Signup.tsx
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RoleSelector } from '../../components/auth/RoleSelector';
import type { Role } from '../../components/auth/RoleSelector';
import styles from './Auth.module.css';
import { getLogger } from '../../utils/logger';

const log = getLogger('Signup');

interface SignupProps {
  allowedRoles?: Role[];
  redirectTo?: string;
}

export const Signup: React.FC<SignupProps> = ({
  allowedRoles = ['customer', 'contractor'],
  redirectTo = '/verify',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Password validation helpers
  const passwordHasUppercase = (pwd: string) => /[A-Z]/.test(pwd);
  const passwordHasNumber = (pwd: string) => /[0-9]/.test(pwd);
  const passwordIsLongEnough = (pwd: string) => pwd.length >= 8;

  const getPasswordErrors = (pwd: string): string[] => {
    const errors: string[] = [];
    if (!passwordIsLongEnough(pwd)) errors.push('at least 8 characters');
    if (!passwordHasUppercase(pwd)) errors.push('at least one uppercase letter');
    if (!passwordHasNumber(pwd)) errors.push('at least one number');
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);

    // Basic field validation
    if (!email || !password || !fullName || !role) {
      setLocalError('All fields are required');
      return;
    }
    if (!popiaConsent) {
      setLocalError('You must consent to POPIA to proceed');
      return;
    }

    // Password strength validation
    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.length > 0) {
      setLocalError(`Password must contain: ${passwordErrors.join(', ')}`);
      return;
    }

    // --- START: Password confirmation validation ---
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    // --- END ---

    console.log('[FE1] - Signup submitted', { email, role, fullName });

    try {
      await signup({
        email,
        password,
        full_name: fullName,
        role,
        phone: phone || undefined,
        popia_consent: popiaConsent,
      });
      navigate(redirectTo);
      log.info('Signup successful, redirecting to', redirectTo);
    } catch (err) {
      console.error('[FE1] - Signup error', err);
    }
  };

  const loginPath = location.pathname.startsWith('/admin') ? '/admin/login' : '/login';

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Account</h1>
        <p className={styles.subtitle}>
          {allowedRoles.includes('admin') ? 'Admin' : 'Join'} SkilledSA
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={isLoading}
            />
          </div>

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
              placeholder="Min 8 chars, uppercase & number"
              required
              disabled={isLoading}
            />
            {password.length > 0 && (
              <div className={styles.passwordHints}>
                <p className={passwordIsLongEnough(password) ? styles.hintValid : styles.hintInvalid}>
                  {passwordIsLongEnough(password) ? '✅' : '❌'} At least 8 characters
                </p>
                <p className={passwordHasUppercase(password) ? styles.hintValid : styles.hintInvalid}>
                  {passwordHasUppercase(password) ? '✅' : '❌'} Contains uppercase letter
                </p>
                <p className={passwordHasNumber(password) ? styles.hintValid : styles.hintInvalid}>
                  {passwordHasNumber(password) ? '✅' : '❌'} Contains a number
                </p>
              </div>
            )}
          </div>

          {/* --- START: Confirm Password Field --- */}
          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              disabled={isLoading}
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <p className={styles.helperError}>Passwords do not match</p>
            )}
          </div>
          {/* --- END --- */}

          <div className={styles.field}>
            <label htmlFor="phone">Phone (optional)</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27 82 123 4567"
              disabled={isLoading}
            />
          </div>

          <div className={styles.field}>
            <label>I am a:</label>
            <RoleSelector
              selectedRole={role}
              onChange={setRole}
              allowedRoles={allowedRoles}
              error={!role && localError ? 'Please select a role' : undefined}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={popiaConsent}
                onChange={(e) => setPopiaConsent(e.target.checked)}
                disabled={isLoading}
              />
              I consent to the processing of my personal data as per POPIA
            </label>
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
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </button>

          <p className={styles.footer}>
            Already have an account? <Link to={loginPath}>Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};