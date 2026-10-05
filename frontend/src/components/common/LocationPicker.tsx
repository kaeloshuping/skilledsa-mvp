// src/components/common/LocationPicker.tsx
import React, { useState, useEffect } from 'react';
import styles from './LocationPicker.module.css';

interface LocationPickerProps {
  onLocationChange: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
  label?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationChange,
  initialLat = -26.2041, // Johannesburg
  initialLng = 28.0473,
  label = 'Job Location',
}) => {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onLocationChange(lat, lng);
  }, [lat, lng, onLocationChange]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setIsLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setIsLoading(false);
      },
      (err) => {
        setError('Unable to retrieve location: ' + err.message);
        setIsLoading(false);
      }
    );
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>{label}</label>
      <div className={styles.row}>
        <div className={styles.field}>
          <label>Latitude</label>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className={styles.field}>
          <label>Longitude</label>
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
          />
        </div>
        <button
          type="button"
          className={styles.locateBtn}
          onClick={getCurrentLocation}
          disabled={isLoading}
        >
          {isLoading ? 'Locating...' : '📍 Use my location'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};