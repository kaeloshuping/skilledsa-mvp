// src/pages/customer/CustomerProfile.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { AuthService } from '../../services/authService';
import type { NotificationPreferences } from '../../services/authService';
import { Toggle } from '../../components/common/Toggle';
import { useToast } from '../../stores/toastStore';
import styles from './CustomerProfile.module.css';

const CITIES = [
  'Johannesburg',
  'Pretoria',
  'Cape Town',
  'Durban',
  'Port Elizabeth',
];

export const CustomerProfile: React.FC = () => {
  const { user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || 'Johannesburg');
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    user?.notification_preference || { email: true, sms: false, push: false }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }

    setLoading(true);

    try {
      const updatedUser = await AuthService.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city,
        notificationPrefs: notifPrefs,
      });

      setUser(updatedUser);
      showToast('Profile updated successfully! ✅', 'success');
      console.log('[FE2] - Profile saved', updatedUser.email);
    } catch (err: unknown) {
      console.error('[FE2] - Profile update error', err);
      let message = 'Failed to update profile';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { message?: string } } }).response;
        if (response?.data?.message) message = response.data.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Profile</h1>
          <button className={styles.backButton} onClick={() => navigate(-1)}>
            ← Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email (read-only)</label>
            <input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className={styles.readOnly}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27 82 123 4567"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="address">Address</label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main Road, Sandton"
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="city">City</label>
            <select
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={loading}
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Notification Preferences</h2>
            <div className={styles.toggleGroup}>
              <Toggle
                checked={notifPrefs.email}
                onChange={(checked) => setNotifPrefs({ ...notifPrefs, email: checked })}
                label="Email notifications"
                disabled={loading}
              />
              <Toggle
                checked={notifPrefs.sms}
                onChange={(checked) => setNotifPrefs({ ...notifPrefs, sms: checked })}
                label="SMS notifications"
                disabled={loading}
              />
              <Toggle
                checked={notifPrefs.push}
                onChange={(checked) => setNotifPrefs({ ...notifPrefs, push: checked })}
                label="Push notifications"
                disabled={loading}
              />
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};