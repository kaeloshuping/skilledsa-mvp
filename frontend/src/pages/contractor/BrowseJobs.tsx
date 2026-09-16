// src/pages/contractor/BrowseJobs.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { JobService, type ContractorJob, type City } from '../../services/jobService';
import { BrowseJobCard } from '../../components/jobs/BrowseJobCard';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import styles from './BrowseJobs.module.css';

type Trade = 'Plumbing' | 'Electrical' | 'Building' | 'Painting' | 'Carpentry' | 'Appliance Repair' | 'All';

const CITIES: Array<{ value: City; label: string }> = [
  { value: 'all', label: 'All Cities' },
  { value: 'Johannesburg', label: 'Johannesburg' },
  { value: 'Pretoria', label: 'Pretoria' },
  { value: 'Cape Town', label: 'Cape Town' },
  { value: 'Durban', label: 'Durban' },
  { value: 'Port Elizabeth', label: 'Port Elizabeth' },
];

export const BrowseJobs: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<ContractorJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedTrade, setSelectedTrade] = useState<Trade>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedCity, setSelectedCity] = useState<City>(() => {
    const city = user?.city;
    if (city && CITIES.some((c) => c.value === city)) {
      return city as City;
    }
    return 'all';
  });

  const { showToast } = useToast();

  const fetchJobs = useCallback(async (reset = true) => {
    const currentPage = reset ? 1 : page;
    setLoading(reset);
    if (!reset) setLoadingMore(true);

    try {
      const params: {
        city: City;
        page: number;
        limit: number;
        trade?: string;
        search?: string;
      } = {
        city: selectedCity,
        page: currentPage,
        limit: 10,
      };

      if (selectedTrade !== 'All') params.trade = selectedTrade;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await JobService.getAvailableJobs(params);
      console.log('[FE2] - Jobs fetched', response);

      if (reset) setJobs(response.data);
      else setJobs((prev) => [...prev, ...response.data]);

      setPage(response.page);
      setHasMore(response.page < response.totalPages);
    } catch (error) {
      console.error('[FE2] - Fetch jobs error', error);
      showToast('Failed to load jobs. Please try again.', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCity, selectedTrade, searchQuery, page, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchJobs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, selectedTrade, searchQuery]);

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchJobs(false);
  };

  const handleTradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTrade(e.target.value as Trade);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(e.target.value as City);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  if (loading && page === 1) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading jobs...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Browse Jobs</h1>
      </header>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="city">City</label>
          <select id="city" value={selectedCity} onChange={handleCityChange} className={styles.select}>
            {CITIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="trade">Trade</label>
          <select id="trade" value={selectedTrade} onChange={handleTradeChange} className={styles.select}>
            <option value="All">All Trades</option>
            <option value="Plumbing">Plumbing</option>
            <option value="Electrical">Electrical</option>
            <option value="Building">Building</option>
            <option value="Painting">Painting</option>
            <option value="Carpentry">Carpentry</option>
            <option value="Appliance Repair">Appliance Repair</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search jobs..."
            className={styles.input}
          />
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className={styles.empty}>
          No jobs found in {selectedCity === 'all' ? 'any city' : selectedCity}.
        </div>
      ) : (
        <div className={styles.jobList}>
          {jobs.map((job) => (
            <BrowseJobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className={styles.loadMore}>
          <button onClick={loadMore} disabled={loadingMore} className={styles.loadMoreButton}>
            {loadingMore ? 'Loading more...' : 'Load more jobs'}
          </button>
        </div>
      )}
    </div>
  );
};