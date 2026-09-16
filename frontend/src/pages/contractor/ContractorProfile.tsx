// src/pages/contractor/ContractorProfile.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { AuthService } from '../../services/authService';
import type { NotificationPreferences } from '../../services/authService';
import { Toggle } from '../../components/common/Toggle';
import { useToast } from '../../stores/toastStore';
import styles from './ContractorProfile.module.css';

const CITIES = ['Johannesburg', 'Pretoria', 'Cape Town', 'Durban', 'Port Elizabeth'];

const TRAVEL_FEE_MIN = 5;
const TRAVEL_FEE_MAX = 15;
const TRAVEL_FEE_CHANGE_COOLDOWN_DAYS = 30;

const canChangeTravelFee = (
  lastChange: string | null | undefined
): { allowed: boolean; nextDate: string | null } => {
  if (!lastChange) return { allowed: true, nextDate: null };
  const last = new Date(lastChange).getTime();
  const next = last + TRAVEL_FEE_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  const allowed = Date.now() >= next;
  return { allowed, nextDate: allowed ? null : new Date(next).toLocaleDateString('en-ZA') };
};

export const ContractorProfile: React.FC = () => {
  const { user } = useAuth();
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || 'Johannesburg');
  const [travelFee, setTravelFee] = useState<number>(user?.travel_fee_per_km ?? 10);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(
    user?.notification_preference || { email: true, sms: false, push: false }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { allowed: canEditFee, nextDate: feeNextDate } = canChangeTravelFee(
    user?.last_travel_fee_change
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!city.trim()) {
      setError('City is required');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await AuthService.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim(),
        travelFeePerKm: canEditFee ? travelFee : undefined,
        notificationPrefs: notifPrefs,
      });

      setUser(updatedUser);
      showToast('Profile updated successfully! ✅', 'success');
      console.log('[FE2] - Contractor profile saved', updatedUser.email);
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

  const bank = user?.bank_details;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Contractor Profile</h1>
          <button className={styles.backButton} onClick={() => navigate(-1)}>← Back</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email (read-only)</label>
            <input id="email" type="email" value={user?.email || ''} disabled className={styles.readOnly} />
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
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Travel Fee</h2>
            <div className={styles.sliderRow}>
              <input
                type="range"
                min={TRAVEL_FEE_MIN}
                max={TRAVEL_FEE_MAX}
                step={1}
                value={travelFee}
                onChange={(e) => setTravelFee(Number(e.target.value))}
                disabled={loading || !canEditFee}
                className={styles.slider}
              />
              <span className={styles.sliderValue}>R{travelFee}/km</span>
            </div>
            <p className={styles.helper}>
              Range: R{TRAVEL_FEE_MIN}–R{TRAVEL_FEE_MAX} per km.
              {feeNextDate
                ? ` Next change available: ${feeNextDate}.`
                : ' You can change this today.'}
            </p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Bank Details (Payout)</h2>
            <div className={styles.field}>
              <label>Bank Name</label>
              <input type="text" value={bank?.bank_name || '—'} disabled className={styles.readOnly} />
            </div>
            <div className={styles.field}>
              <label>Account Number</label>
              <input type="text" value={bank?.account_number || '—'} disabled className={styles.readOnly} />
            </div>
            <div className={styles.field}>
              <label>Branch Code</label>
              <input type="text" value={bank?.branch_code || '—'} disabled className={styles.readOnly} />
            </div>
            <p className={styles.helper}>Contact support to update your bank details.</p>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Notification Preferences</h2>
            <div className={styles.toggleGroup}>
              <Toggle
                checked={notifPrefs.email}
                onChange={(v) => setNotifPrefs({ ...notifPrefs, email: v })}
                label="Email notifications"
                disabled={loading}
              />
              <Toggle
                checked={notifPrefs.sms}
                onChange={(v) => setNotifPrefs({ ...notifPrefs, sms: v })}
                label="SMS notifications"
                disabled={loading}
              />
              <Toggle
                checked={notifPrefs.push}
                onChange={(v) => setNotifPrefs({ ...notifPrefs, push: v })}
                label="Push notifications"
                disabled={loading}
              />
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button type="submit" className={styles.primaryButton} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};