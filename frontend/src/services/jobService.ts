// src/services/jobService.ts
import apiClient from './apiClient';
import { getLogger } from '../utils/logger';

const log = getLogger('jobService');

// ============================================================
// Existing Types (customer job creation)
// ============================================================

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
 * Full Job response interface for customer (may not include distance/rating).
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

// ============================================================
// NEW Types for Contractor Browsing
// ============================================================

export interface ContractorJob {
  id: string;
  title: string;
  description: string;
  trade: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  distance?: number; // in km (calculated by backend)
  travelFeeAccepted: boolean;
  status: 'draft' | 'open' | 'quoted' | 'accepted' | 'milestone1_pending' | 'milestone1_verified' | 'milestone2_pending' | 'completed' | 'disputed';
  photos: string[];
  customer: {
    id: string;
    full_name: string;
    rating?: number; // average rating
  };
  createdAt: string;
  updatedAt: string;
}

export interface FetchAvailableJobsParams {
  trade?: string;
  search?: string;
  lat?: number;
  lng?: number;
  radius?: number; // in km, default 35
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

// ============================================================
// Service Class (existing + new methods)
// ============================================================

export class JobService {
  // --- Existing methods (unchanged) ---

  static async getPresignedUrl(fileName: string, contentType: string): Promise<{ url: string; key: string }> {
    log.info('Getting presigned URL for job photo', { fileName });
    const response = await apiClient.post<{ url: string; key: string }>('/verification/presigned-url', {
      fileName,
      contentType,
    });
    return response.data;
  }

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

  static async createJob(data: CreateJobData): Promise<Job> {
    log.info('Creating job', data);
    const response = await apiClient.post<Job>('/jobs', data);
    return response.data;
  }

  static async getJobs(customerId: string, limit?: number): Promise<JobSummary[]> {
    log.info('Fetching jobs for customer', { customerId, limit });
    const params = new URLSearchParams({ customerId });
    if (limit) params.append('limit', String(limit));
    const response = await apiClient.get<JobSummary[]>(`/jobs?${params.toString()}`);
    return response.data;
  }

  static async getJobStats(customerId: string): Promise<JobStats> {
    log.info('Fetching job stats for customer', { customerId });
    const response = await apiClient.get<JobStats>(`/jobs/stats?customerId=${customerId}`);
    return response.data;
  }

  // --- NEW methods for contractor browsing ---

  /**
   * Fetch available jobs for contractors with filters and geolocation.
   */
  static async getAvailableJobs(params: FetchAvailableJobsParams): Promise<AvailableJobsResponse> {
    log.info('Fetching available jobs', params);
    const response = await apiClient.get<AvailableJobsResponse>('/jobs/available', { params });
    console.log('[FE2] - Fetched available jobs:', response.data.total);
    return response.data;
  }

  /**
   * Fetch a single job by ID (for contractor detail view).
   */
  static async getJobById(id: string): Promise<ContractorJob> {
    log.info('Fetching job by ID', { id });
    const response = await apiClient.get<{ data: ContractorJob }>(`/jobs/${id}`);
    console.log('[FE2] - Fetched job detail:', response.data.data.id);
    return response.data.data;
  }
}