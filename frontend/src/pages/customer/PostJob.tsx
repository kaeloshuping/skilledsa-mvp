// src/pages/customer/PostJob.tsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { JobService } from '../../services/jobService';
import { FileUpload, type UploadedFile } from '../../components/common/FileUpload';
import { Toggle } from '../../components/common/Toggle';
import { LocationPicker } from '../../components/common/LocationPicker';
import { useToast } from '../../stores/toastStore';
import styles from './PostJob.module.css';

const trades = ['Plumbing', 'Electrical', 'Building/Tiling', 'Painting', 'Carpentry', 'Appliance Repair'];

export const PostJob: React.FC = () => {
  useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [trade, setTrade] = useState(trades[0]);
  const [photos, setPhotos] = useState<UploadedFile[]>([]);
  const [needsConsultation, setNeedsConsultation] = useState(false);
  const [travelFeeWilling, setTravelFeeWilling] = useState(true);
  const [location, setLocation] = useState({ lat: -26.2041, lng: 28.0473 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    setLocation({ lat, lng });
  }, []);

  const handlePhotosChange = (files: UploadedFile[]) => {
    setPhotos(files);
  };

  const handleUploadPhoto = async (file: File, onProgress: (progress: number) => void) => {
    const { url, key } = await JobService.getPresignedUrl(file.name, file.type);
    await JobService.uploadFileToS3(url, file, onProgress);
    return { url, key };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    if (!trade) {
      setError('Please select a trade');
      return;
    }
    const uploadedPhotos = photos.filter(p => p.status === 'done' && p.url);
    if (uploadedPhotos.length === 0) {
      setError('Please upload at least one photo');
      return;
    }

    setLoading(true);

    try {
      const photoUrls = uploadedPhotos.map(p => p.url as string);
      await JobService.createJob({
        title: title.trim(),
        description: description.trim(),
        trade,
        photos: photoUrls,
        location: {
          lat: location.lat,
          lng: location.lng,
        },
        needsConsultation,
        travelFeeWilling,
      });

      showToast('Job posted successfully! 🎉', 'success');
      navigate('/dashboard');
    } catch (err: unknown) {
      console.error('[FE1] - Create job error', err);
      let message = 'Failed to create job';

      // Type guard for Axios-like error
      if (err && typeof err === 'object' && 'response' in err) {
        const response = err.response;
        if (response && typeof response === 'object' && 'data' in response) {
          const data = response.data;
          if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
            message = data.message;
          }
        }
      } else if (err instanceof Error) {
        message = err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Post a Job</h1>
        <p className={styles.subtitle}>Tell us what you need, and get quotes from trusted contractors.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="title">Job Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Fix leaking geyser"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work needed, materials, etc."
              rows={4}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="trade">Trade</label>
            <select
              id="trade"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              disabled={loading}
            >
              {trades.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <FileUpload
              label="Photos"
              required
              maxFiles={5}
              maxSizeMB={5}
              acceptedTypes={['image/jpeg', 'image/png']}
              onFilesChange={handlePhotosChange}
              onUpload={handleUploadPhoto}
            />
          </div>

          <div className={styles.field}>
            <LocationPicker
              label="Job Location"
              onLocationChange={handleLocationChange}
              initialLat={location.lat}
              initialLng={location.lng}
            />
          </div>

          <div className={styles.field}>
            <Toggle
              checked={needsConsultation}
              onChange={setNeedsConsultation}
              label="Needs on-site consultation"
              helperText="Contractors may need to visit the site before quoting."
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <Toggle
              checked={travelFeeWilling}
              onChange={setTravelFeeWilling}
              label="Willing to pay travel fee for contractors >35km away"
              helperText="If ON, contractors outside 35km can see and quote this job."
              disabled={loading}
            />
          </div>

          {error && (
            <div className={styles.errorMessage}>{error}</div>
          )}

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={loading}
          >
            {loading ? 'Creating job...' : 'Post Job'}
          </button>
        </form>
      </div>
    </div>
  );
};