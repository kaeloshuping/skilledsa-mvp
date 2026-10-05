// src/services/jobService.ts
import apiClient from './apiClient';
import { getLogger } from '../utils/logger';

const log = getLogger('jobService');

// --- Customer job creation types ---
export interface JobPhotoUpload {
  file: File;
  url: string;
  key: string;
}

export interface CreateJobData {
  title: string;
  description: string;
  trade: string;
  photos: string[];
  address: string;
  city: string;
  needsConsultation: boolean;
  travelFeeWilling: boolean;
}

export interface Job {
  id: string;
  title: string;
  description: string;
  trade: string;
  photos: string[];
  address: string;
  city: string;
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
  static async getPresignedUrl(fileName: string, contentType: string): Promise<{ url: string; key: string }> {
    log.info('Getting presigned URL', { fileName });
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
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => (xhr.status === 200 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }

  static async createJob(data: CreateJobData): Promise<Job> {
    log.info('Creating job', data);
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

  static async getContractorStats(contractorId: string, trade?: string, city?: string): Promise<ContractorStats> {
    log.info('Fetching contractor stats', { contractorId, trade, city });
    const response = await apiClient.get<ContractorStats>(`/contractors/${contractorId}/stats`, {
      params: { trade, city },
    });
    console.log('[FE2] - Contractor stats fetched:', response.data);
    return response.data;
  }
}