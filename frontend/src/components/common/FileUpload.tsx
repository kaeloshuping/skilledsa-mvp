// src/components/common/FileUpload.tsx
import React, { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react'; // type-only imports
import styles from './FileUpload.module.css';

export interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'done' | 'error';
  error?: string;
  url?: string; // after upload
  key?: string;
}

interface FileUploadProps {
  label: string;
  required?: boolean;
  maxFiles?: number;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  onFilesChange: (files: UploadedFile[]) => void;
  onUpload: (file: File, onProgress: (progress: number) => void) => Promise<{ url: string; key: string }>;
  existingFiles?: UploadedFile[];
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  required = false,
  maxFiles = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
  maxSizeMB = 5,
  onFilesChange,
  onUpload,
  existingFiles = [],
}) => {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      // Validate type
      if (!acceptedTypes.includes(file.type)) {
        newFiles.push({
          id: `${Date.now()}-${i}`,
          file,
          progress: 0,
          status: 'error',
          error: `File type not allowed (${file.type})`,
        });
        continue;
      }
      // Validate size
      if (file.size > maxSizeMB * 1024 * 1024) {
        newFiles.push({
          id: `${Date.now()}-${i}`,
          file,
          progress: 0,
          status: 'error',
          error: `File exceeds ${maxSizeMB}MB`,
        });
        continue;
      }
      // Check max files
      if (files.length + newFiles.length >= maxFiles) {
        break;
      }
      newFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        progress: 0,
        status: 'idle',
      });
    }

    // Start upload for each new file
    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);

    // Upload each idle file
    for (const fileObj of newFiles) {
      if (fileObj.status === 'idle') {
        try {
          // Update status to uploading
          const uploadingFiles = updatedFiles.map(f =>
            f.id === fileObj.id ? { ...f, status: 'uploading' as const } : f
          );
          setFiles(uploadingFiles);
          onFilesChange(uploadingFiles);

          const { url, key } = await onUpload(fileObj.file, (progress) => {
            // Update progress
            const progressFiles = uploadingFiles.map(f =>
              f.id === fileObj.id ? { ...f, progress } : f
            );
            setFiles(progressFiles);
            onFilesChange(progressFiles);
          });

          // Mark as done
          const doneFiles = uploadingFiles.map(f =>
            f.id === fileObj.id ? { ...f, status: 'done' as const, progress: 100, url, key } : f
          );
          setFiles(doneFiles);
          onFilesChange(doneFiles);
        } catch (error) {
          const errorMsg = (error as Error).message || 'Upload failed';
          const errorFiles = updatedFiles.map(f =>
            f.id === fileObj.id ? { ...f, status: 'error' as const, error: errorMsg } : f
          );
          setFiles(errorFiles);
          onFilesChange(errorFiles);
        }
      }
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (id: string) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    onFilesChange(updated);
  };

  const renderFileStatus = (fileObj: UploadedFile) => {
    if (fileObj.status === 'uploading') {
      return (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${fileObj.progress}%` }} />
          <span>{fileObj.progress}%</span>
        </div>
      );
    }
    if (fileObj.status === 'done') {
      return <span className={styles.success}>✅ Uploaded</span>;
    }
    if (fileObj.status === 'error') {
      return <span className={styles.error}>{fileObj.error}</span>;
    }
    return null;
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        {label} {required && <span className={styles.required}>*</span>}
      </label>
      <div
        className={`${styles.dropZone} ${isDragging ? styles.dragover : ''}`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className={styles.uploadPrompt}>
          <span className={styles.icon}>📁</span>
          <p>Drag & drop or click to upload</p>
          <small>Accepted: {acceptedTypes.join(', ')} (max {maxSizeMB}MB each)</small>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleFileSelect(e.target.files)}
        />
      </div>
      {files.length > 0 && (
        <ul className={styles.fileList}>
          {files.map((fileObj) => (
            <li key={fileObj.id} className={styles.fileItem}>
              <span className={styles.fileName}>{fileObj.file.name}</span>
              {renderFileStatus(fileObj)}
              <button className={styles.removeBtn} onClick={() => removeFile(fileObj.id)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};