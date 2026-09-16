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

const UPLOAD_MODE: 'local' | 's3' = (import.meta.env.VITE_UPLOAD_MODE as 'local' | 's3') || 's3';

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

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
    console.log('[FE1] - VerificationUpload upload mode:', UPLOAD_MODE);
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
        [field]: { ...prev[field]!, error: 'File type not allowed (JPG, PNG, PDF)' } as UploadedFile,
      }));
      return;
    }

    // Validate size (max 5MB for images, 10MB for PDF)
    const maxSize = selectedFile.type === 'application/pdf' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setFiles((prev) => ({
        ...prev,
        [field]: { ...prev[field]!, error: `File size exceeds ${maxSize / (1024 * 1024)}MB` } as UploadedFile,
      }));
      return;
    }

    console.log('[FE1] - File selected for', field, selectedFile.name, 'mode:', UPLOAD_MODE);

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

    try {
      if (UPLOAD_MODE === 'local') {
        // Local mode: multipart POST to backend
        await uploadLocal(selectedFile, field);
      } else {
        // S3 mode: presigned URL flow
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

        await uploadToS3(url, selectedFile, field);
      }
    } catch (error: unknown) {
      let errMsg = 'Upload failed';
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        errMsg = response?.data?.message || errMsg;
      } else if (error instanceof Error) {
        errMsg = error.message;
      }
      setFiles((prev) => ({
        ...prev,
        [field]: {
          ...prev[field]!,
          status: 'error',
          error: errMsg,
        },
      }));
      console.error('[FE1] - Upload error', error);
    }
  };

  /**
   * Upload via local multipart POST to backend.
   * Progress is tracked via XHR.
   */
  const uploadLocal = (file: File, field: FileField) => {
    return new Promise<void>((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', field);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${import.meta.env.VITE_API_BASE_URL}/upload`);
      if (accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      }
      // Do NOT set Content-Type; XHR sets it with the boundary for multipart.

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setFiles((prev) => ({
            ...prev,
            [field]: {
              ...prev[field]!,
              progress,
              status: 'uploading',
            },
          }));
          console.log('[FE1] - Local upload progress', field, progress + '%');
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const url: string = data.url;
            setFiles((prev) => ({
              ...prev,
              [field]: {
                ...prev[field]!,
                url,
                status: 'done',
                progress: 100,
              },
            }));
            console.log('[FE1] - Local upload complete', field, url);
            resolve();
          } catch {
            reject(new Error('Invalid response from upload server'));
          }
        } else {
          let msg = `Upload failed with status ${xhr.status}`;
          try {
            const data = JSON.parse(xhr.responseText);
            msg = data.message || msg;
          } catch {
            // ignore JSON parse errors
          }
          reject(new Error(msg));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.send(formData);
    });
  };

  /**
   * Upload to S3 via presigned URL.
   */
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
          console.log('[FE1] - S3 upload progress', field, progress + '%');
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
          console.log('[FE1] - S3 upload complete', field);
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.send(file);
    });
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setIsSubmitting(true);

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

    if (user?.role === 'contractor' && (!certificate || certificate.status !== 'done')) {
      setSubmitError('Please upload your trade certificate');
      setIsSubmitting(false);
      return;
    }

    const payload: {
      id_photo_url: string;
      selfie_url: string;
      certificate_url?: string;
    } = {
      id_photo_url: idPhoto.url,
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
      setTimeout(() => {
        navigate('/verification-pending');
      }, 2000);
    } catch (error: unknown) {
      let msg = 'Submission failed';
      if (error && typeof error === 'object' && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        msg = response?.data?.message || msg;
      } else if (error instanceof Error) {
        msg = error.message;
      }
      setSubmitError(msg);
      console.error('[FE1] - Submission error', error);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              const fakeEvent = { target: { files: [droppedFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
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
            onClick={() => navigate('/dashboard')}
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