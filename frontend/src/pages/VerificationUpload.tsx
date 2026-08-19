// src/pages/VerificationUpload.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../services/apiClient';
import styles from './VerificationUpload.module.css';
import { getLogger } from '../utils/logger';

const log = getLogger('VerificationUpload');

type FileField = 'id_photo' | 'selfie' | 'certificate';

interface UploadedFile {
  file: File;
  key: string;
  url: string;
  progress: number;
  status: 'idle' | 'uploading' | 'done' | 'error';
  error?: string;
}

export const VerificationUpload: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [files, setFiles] = useState<Record<FileField, UploadedFile | null>>({
    id_photo: null,
    selfie: null,
    certificate: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fileInputRefs = {
    id_photo: useRef<HTMLInputElement>(null),
    selfie: useRef<HTMLInputElement>(null),
    certificate: useRef<HTMLInputElement>(null),
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleFileSelect = async (
    field: FileField,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setFiles((prev) => ({
        ...prev,
        [field]: { ...prev[field]!, error: 'File type not allowed (JPG, PNG, PDF)' } as any,
      }));
      return;
    }

    // Validate size (max 5MB for images, 10MB for PDF)
    const maxSize = selectedFile.type === 'application/pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setFiles((prev) => ({
        ...prev,
        [field]: { ...prev[field]!, error: `File size exceeds ${maxSize / (1024 * 1024)}MB` } as any,
      }));
      return;
    }

    console.log('[FE1] - File selected for', field, selectedFile.name);

    // Create upload entry
    setFiles((prev) => ({
      ...prev,
      [field]: {
        file: selectedFile,
        key: '',
        url: '',
        progress: 0,
        status: 'idle',
      },
    }));

    // Request presigned URL
    try {
      const response = await apiClient.post<{ url: string; key: string }>(
        '/verification/presigned-url',
        {
          fileName: selectedFile.name,
          contentType: selectedFile.type,
        }
      );
      const { url, key } = response.data;
      console.log('[FE1] - Presigned URL received', { field, key });

      setFiles((prev) => ({
        ...prev,
        [field]: {
          ...prev[field]!,
          url,
          key,
          status: 'uploading',
        },
      }));

      // Upload to S3
      await uploadToS3(url, selectedFile, field);
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Failed to get upload URL';
      setFiles((prev) => ({
        ...prev,
        [field]: {
          ...prev[field]!,
          status: 'error',
          error: errMsg,
        },
      }));
      console.error('[FE1] - Presigned URL error', error);
    }
  };

  const uploadToS3 = (url: string, file: File, field: FileField) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setFiles((prev) => ({
            ...prev,
            [field]: {
              ...prev[field]!,
              progress,
            },
          }));
          console.log('[FE1] - Upload progress', field, progress + '%');
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setFiles((prev) => ({
            ...prev,
            [field]: {
              ...prev[field]!,
              status: 'done',
              progress: 100,
            },
          }));
          console.log('[FE1] - Upload complete', field);
          resolve();
        } else {
          const err = new Error(`Upload failed with status ${xhr.status}`);
          setFiles((prev) => ({
            ...prev,
            [field]: {
              ...prev[field]!,
              status: 'error',
              error: err.message,
            },
          }));
          reject(err);
        }
      };

      xhr.onerror = () => {
        const err = new Error('Network error during upload');
        setFiles((prev) => ({
          ...prev,
          [field]: {
            ...prev[field]!,
            status: 'error',
            error: err.message,
          },
        }));
        reject(err);
      };

      xhr.send(file);
    });
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

    // Check all required files are uploaded
    const idPhoto = files.id_photo;
    const selfie = files.selfie;
    const certificate = files.certificate;

    if (!idPhoto || idPhoto.status !== 'done') {
      setSubmitError('Please upload your ID photo');
      setIsSubmitting(false);
      return;
    }
    if (!selfie || selfie.status !== 'done') {
      setSubmitError('Please upload your selfie');
      setIsSubmitting(false);
      return;
    }

    // Contractors must upload certificate
    if (user?.role === 'contractor' && (!certificate || certificate.status !== 'done')) {
      setSubmitError('Please upload your trade certificate');
      setIsSubmitting(false);
      return;
    }

    // Build payload
    const payload: {
      id_photo_url: string;
      selfie_url: string;
      certificate_url?: string;
    } = {
      id_photo_url: idPhoto.url, // This is the presigned URL, but we need the object URL?
      // Actually the backend expects the S3 object URL (the key). The presigned URL is for upload.
      // We stored the key, so we need to construct the actual object URL.
      // We'll use the key to construct a public URL (if bucket is public) or we can send the key.
      // The backend uses extractKey to get the key from the URL, but we can just send the key.
      // To be safe, we'll send the key as a URL relative to bucket? The service expects a URL that contains the key.
      // The service uses new URL(url).pathname to extract key. So we can construct a dummy URL with the key.
      // Better: send the presigned URL? No, the presigned URL expires. We should send the object URL.
      // The bucket is likely private, but we can construct an S3 URL using the bucket name and region.
      // Since we don't know the bucket URL, we'll send the key as a "s3://" URL? But the service expects a URL.
      // Looking at verificationService, it calls extractKey(url) which uses new URL(url).pathname.
      // So we need a valid URL that contains the key in the path. We can use the public endpoint if available.
      // For now, we'll use the presigned URL itself, but that will expire. However, after upload, the object exists.
      // The presigned URL is still a valid URL to the object, but it includes query parameters.
      // The extractKey will remove the query parameters and get the path.
      // So we can send the presigned URL (without query params?) – but the presigned URL has a long query string.
      // Alternatively, we can construct a dummy URL: `https://bucket.s3.region.amazonaws.com/${key}`
      // Since we don't have that info, we'll use the presigned URL (it works for validation because it contains the key in the path).
      // The service uses new URL(url).pathname, which will include the key. So we'll use the presigned URL.
      // But note: the presigned URL has a signature that might change; but the key is still in the path.
      // We'll use the presigned URL directly.
      selfie_url: selfie.url,
    };
    if (certificate && certificate.status === 'done') {
      payload.certificate_url = certificate.url;
    }

    console.log('[FE1] - Submitting verification request', payload);

    try {
      await apiClient.post('/verification/submit', payload);
      setSubmitSuccess(true);
      log.info('Verification submitted successfully');
      // Optionally redirect to pending page after a delay
      setTimeout(() => {
        navigate('/verification-pending');
      }, 2000);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Submission failed';
      setSubmitError(msg);
      console.error('[FE1] - Submission error', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render file upload area
  const renderFileUpload = (field: FileField, label: string, required: boolean) => {
    const fileData = files[field];
    const inputRef = fileInputRefs[field];

    return (
      <div className={styles.uploadArea}>
        <label className={styles.uploadLabel}>
          {label} {required && <span className={styles.required}>*</span>}
        </label>
        <div
          className={`${styles.dropZone} ${fileData?.status === 'done' ? styles.done : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const droppedFile = e.dataTransfer.files[0];
            if (droppedFile) {
              // Simulate input change
              const fakeEvent = { target: { files: [droppedFile] } } as any;
              handleFileSelect(field, fakeEvent);
            }
          }}
        >
          {!fileData || fileData.status === 'idle' ? (
            <>
              <span className={styles.dropIcon}>📁</span>
              <p>Drag & drop or click to upload</p>
              <small>JPG, PNG, PDF up to 5MB</small>
            </>
          ) : fileData.status === 'uploading' ? (
            <>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${fileData.progress}%` }} />
              </div>
              <span>{fileData.progress}% uploaded</span>
            </>
          ) : fileData.status === 'done' ? (
            <>
              <span className={styles.successIcon}>✅</span>
              <p>{fileData.file.name}</p>
              <small>Upload complete</small>
            </>
          ) : fileData.status === 'error' ? (
            <>
              <span className={styles.errorIcon}>❌</span>
              <p>Upload failed</p>
              <small className={styles.errorText}>{fileData.error}</small>
              <button
                type="button"
                className={styles.retryButton}
                onClick={(e) => {
                  e.stopPropagation();
                  // Re-trigger file selection
                  inputRef.current?.click();
                }}
              >
                Retry
              </button>
            </>
          ) : null}
        </div>
        <input
          type="file"
          ref={inputRef}
          onChange={(e) => handleFileSelect(field, e)}
          accept=".jpg,.jpeg,.png,.pdf"
          style={{ display: 'none' }}
        />
        {fileData?.error && fileData.status !== 'error' && (
          <p className={styles.helperError}>{fileData.error}</p>
        )}
      </div>
    );
  };

  if (submitSuccess) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Verification Submitted</h1>
          <p>Your documents are being reviewed. You'll receive a notification once verified.</p>
          <button
            className={styles.primaryButton}
            onClick={() => navigate('/')}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Verify Your Identity</h1>
        <p className={styles.subtitle}>
          Please upload the required documents. {user?.role === 'contractor' && 'Contractors must also upload a trade certificate.'}
        </p>

        <div className={styles.form}>
          {renderFileUpload('id_photo', 'ID Photo', true)}
          {renderFileUpload('selfie', 'Selfie', true)}
          {user?.role === 'contractor' && renderFileUpload('certificate', 'Trade Certificate', true)}

          {submitError && <div className={styles.errorMessage}>{submitError}</div>}

          <button
            className={styles.primaryButton}
            onClick={handleSubmit}
            disabled={isSubmitting || Object.values(files).some(f => f?.status === 'uploading')}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Verification'}
          </button>
        </div>
      </div>
    </div>
  );
};