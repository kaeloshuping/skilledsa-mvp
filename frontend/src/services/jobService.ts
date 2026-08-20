// src/services/jobService.ts
import apiClient from './apiClient';
import { getLogger } from '../utils/logger';

const log = getLogger('jobService');

export interface JobPhotoUpload {
  file: File;
  url: string; // presigned URL
  key: string;
}

export interface CreateJobData {
  title: string;
  description: string;
  trade: string;
  photos: string[]; // array of URLs (presigned URLs or keys)
  location: {
    lat: number;
    lng: number;
  };
  needsConsultation: boolean;
  travelFeeWilling: boolean;
}

/**
 * Minimal Job response interface – extend as backend matures.
 */
export interface Job {
  id: string;
  title: string;
  description: string;
  trade: string;
  photos: string[];
  location: {
    lat: number;
    lng: number;
  };
  needsConsultation: boolean;
  travelFeeWilling: boolean;
  status: string;
  customer_id: string;
  created_at: string;
  updated_at: string;
}

export class JobService {
  /**
   * Get a presigned URL for uploading a job photo.
   */
  static async getPresignedUrl(fileName: string, contentType: string): Promise<{ url: string; key: string }> {
    log.info('Getting presigned URL for job photo', { fileName });
    const response = await apiClient.post<{ url: string; key: string }>('/verification/presigned-url', {
      fileName,
      contentType,
    });
    return response.data;
  }

  /**
   * Upload a file to S3 using a presigned URL.
   * Returns a promise that resolves when the upload is complete.
   */
  static async uploadFileToS3(url: string, file: File, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
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
  }

  /**
   * Create a new job.
   * Returns the created job object.
   */
  static async createJob(data: CreateJobData): Promise<Job> {
    log.info('Creating job', data);
    const response = await apiClient.post<Job>('/jobs', data);
    return response.data;
  }
}