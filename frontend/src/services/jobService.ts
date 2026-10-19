// src/services/jobService.ts
import apiClient from './apiClient';
import { useAuthStore } from '../stores/authStore';
import { getLogger } from '../utils/logger';

const log = getLogger('jobService');

// Upload mode is fixed at build time by Vite. Any value other than an
// explicit 's3' falls back to 'local' so a missing or malformed value
// cannot silently route traffic to a misconfigured bucket.
const UPLOAD_MODE: 'local' | 's3' = import.meta.env.VITE_UPLOAD_MODE === 's3' ? 's3' : 'local';

// --- Customer job creation types ---
export interface JobPhotoUpload {
  file: File;
  url: string;
  key: string;
}

/**
 * Payload for POST /api/v1/jobs.
 *
 * `travelFeeAccepted` matches the backend schema field name. The UI
 * toggles a "willing to pay travel fee" state; PostJob maps that to
 * this field on submit.
 *
 * Coordinates are optional. During development job matching relies
 * on the manual `city` and `address` fields; Google Distance Matrix
 * integration will supply coordinates once that feature is enabled.
 */
export interface CreateJobData {
  title: string;
  description: string;
  trade: string;
  photos: string[];
  address: string;
  city: string;
  needsConsultation: boolean;
  travelFeeAccepted: boolean;
  locationLat?: number;
  locationLng?: number;
}

/**
 * Shape of a Job returned by the backend. Field names mirror the
 * Prisma model (camelCase) as serialized over JSON.
 */
export interface Job {
  id: string;
  title: string;
  description: string;
  trade: string;
  photos: string[];
  address: string | null;
  city: string;
  needsConsultation: boolean;
  travelFeeAccepted: boolean;
  locationLat: number | null;
  locationLng: number | null;
  status: string;
  customerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobStats {
  posted: number;
  active: number;
  completed: number;
}

export interface JobSummary {
  id: string;
  title: string;
  trade: string;
  status: 'open' | 'active' | 'completed' | 'cancelled' | 'disputed';
  quoteCount: number;
  createdAt: string;
}

// --- Contractor browsing types (city-based) ---
export type City = 'Johannesburg' | 'Pretoria' | 'Cape Town' | 'Durban' | 'Port Elizabeth' | 'all';

export interface ContractorJob {
  id: string;
  title: string;
  description: string;
  trade: string;
  city: string;
  address?: string;
  location?: { lat: number; lng: number; address?: string };
  travelFeeAccepted: boolean;
  status:
    | 'draft'
    | 'open'
    | 'quoted'
    | 'accepted'
    | 'milestone1_pending'
    | 'milestone1_verified'
    | 'milestone2_pending'
    | 'completed'
    | 'disputed';
  photos: string[];
  customer: {
    id: string;
    full_name: string;
    rating?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FetchAvailableJobsParams {
  trade?: string;
  search?: string;
  city?: City;
  page?: number;
  limit?: number;
}

export interface AvailableJobsResponse {
  data: ContractorJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContractorStats {
  available: number;
  active: number;
  completed: number;
}

export class JobService {
  /**
   * Upload a file using the currently configured storage backend.
   *
   * - `local` mode: POSTs `multipart/form-data` to the backend's
   *   `/api/v1/upload` endpoint, which writes to disk and returns the
   *   public URL and storage key.
   * - `s3` mode: obtains a presigned URL from the backend and PUTs the
   *   file directly to S3.
   *
   * Both paths return `{ url, key }` so callers can treat them uniformly.
   */
  static async uploadFile(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<{ url: string; key: string }> {
    if (UPLOAD_MODE === 'local') {
      return JobService.uploadFileLocal(file, onProgress);
    }
    const { url, key } = await JobService.getPresignedUrl(file.name, file.type);
    await JobService.uploadFileToS3(url, file, onProgress);
    return { url, key };
  }

  /**
   * Local-mode upload: POST multipart/form-data to the backend.
   * Uses XHR (not fetch/axios) so upload progress can be tracked, and
   * so the request is not subject to the apiClient's JSON Content-Type
   * default, which would break multipart parsing.
   */
  private static async uploadFileLocal(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<{ url: string; key: string }> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'jobs');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${baseUrl}/upload`);

      const { accessToken } = useAuthStore.getState();
      if (accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      }
      // Content-Type is set automatically by XHR for multipart/form-data,
      // including the required boundary token.

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (typeof data.url !== 'string' || typeof data.key !== 'string') {
              reject(new Error('Upload response missing url or key'));
              return;
            }
            resolve({ url: data.url, key: data.key });
          } catch {
            reject(new Error('Invalid response from upload server'));
          }
        } else {
          let message = `Upload failed with status ${xhr.status}`;
          try {
            const data = JSON.parse(xhr.responseText);
            message = data.error || data.message || message;
          } catch {
            // Response body was not JSON; use the default message.
          }
          reject(new Error(message));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  }

  static async getPresignedUrl(
    fileName: string,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    log.info('Getting presigned URL', { fileName });
    const response = await apiClient.post<{ url: string; key: string }>(
      '/verification/presigned-url',
      {
        fileName,
        contentType,
      },
    );
    return response.data;
  }

  static async uploadFileToS3(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () =>
        xhr.status === 200 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }

  static async createJob(data: CreateJobData): Promise<Job> {
    log.info('Creating job', { title: data.title, trade: data.trade });
    const response = await apiClient.post<Job>('/jobs', data);
    return response.data;
  }

  static async getJobs(customerId: string, limit?: number): Promise<JobSummary[]> {
    const params = new URLSearchParams({ customerId });
    if (limit) params.append('limit', String(limit));
    const response = await apiClient.get<JobSummary[]>(`/jobs?${params.toString()}`);
    return response.data;
  }

  static async getJobStats(customerId: string): Promise<JobStats> {
    const response = await apiClient.get<JobStats>(`/jobs/stats?customerId=${customerId}`);
    return response.data;
  }

  static async getAvailableJobs(params: FetchAvailableJobsParams): Promise<AvailableJobsResponse> {
    log.info('Fetching available jobs', params);
    const response = await apiClient.get<AvailableJobsResponse>('/jobs/available', { params });
    console.log('[FE2] - Fetched available jobs:', response.data.total);
    return response.data;
  }

  static async getJobById(id: string): Promise<ContractorJob> {
    const response = await apiClient.get<{ data: ContractorJob }>(`/jobs/${id}`);
    console.log('[FE2] - Fetched job detail:', response.data.data.id);
    return response.data.data;
  }

  static async getContractorStats(
    contractorId: string,
    trade?: string,
    city?: string,
  ): Promise<ContractorStats> {
    log.info('Fetching contractor stats', { contractorId, trade, city });
    const response = await apiClient.get<ContractorStats>(`/contractors/${contractorId}/stats`, {
      params: { trade, city },
    });
    console.log('[FE2] - Contractor stats fetched:', response.data);
    return response.data;
  }
}
