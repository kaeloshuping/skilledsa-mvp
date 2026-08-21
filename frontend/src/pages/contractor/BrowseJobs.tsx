// src/pages/contractor/BrowseJobs.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { JobService, type ContractorJob } from '../../services/jobService';
import { BrowseJobCard } from '../../components/jobs/BrowseJobCard';
import { useToast } from '../../hooks/useToast';
import styles from './BrowseJobs.module.css';

type Trade = 'Plumbing' | 'Electrical' | 'Building' | 'Painting' | 'Carpentry' | 'Appliance Repair' | 'All';

export const BrowseJobs: React.FC = () => {
  const [jobs, setJobs] = useState<ContractorJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedTrade, setSelectedTrade] = useState<Trade>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWithin35km, setShowWithin35km] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const { showToast } = useToast();

  // --- Geolocation ---
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('[FE2] - Got geolocation', pos.coords);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('[FE2] - Geolocation error', err);
          showToast('Unable to get your location. Showing jobs near you.', 'warning');
          // Fallback: Johannesburg
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setLocation({ lat: -26.2041, lng: 28.0473 });
        }
      );
    } else {
      showToast('Geolocation not supported. Showing jobs near you.', 'warning');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation({ lat: -26.2041, lng: 28.0473 });
    }
  }, [showToast]);

  // --- Data fetching ---
  const fetchJobs = useCallback(async (reset = true) => {
    if (!location) return;

    const currentPage = reset ? 1 : page;
    setLoading(reset);
    if (!reset) setLoadingMore(true);

    try {
      const params: {
        lat: number;
        lng: number;
        page: number;
        limit: number;
        trade?: string;
        search?: string;
        radius?: number;
      } = {
        lat: location.lat,
        lng: location.lng,
        page: currentPage,
        limit: 10,
      };

      if (selectedTrade !== 'All') {
        params.trade = selectedTrade;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (showWithin35km) {
        params.radius = 35;
      }

      const response = await JobService.getAvailableJobs(params);
      console.log('[FE2] - Jobs fetched', response);

      if (reset) {
        setJobs(response.data);
      } else {
        setJobs((prev) => [...prev, ...response.data]);
      }
      setPage(response.page);
      setHasMore(response.page < response.totalPages);
    } catch (error) {
      console.error('[FE2] - Fetch jobs error', error);
      showToast('Failed to load jobs. Please try again.', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [location, selectedTrade, searchQuery, showWithin35km, page, showToast]);

  // --- Trigger initial fetch and filter changes ---
  useEffect(() => {
    if (location) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchJobs(true);
    }
    // The fetchJobs dependency is stable, but we want to re-run on filter changes.
    // We exclude fetchJobs from deps to avoid infinite loops, but it's safe because it's memoized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, selectedTrade, searchQuery, showWithin35km]);

  // --- Load more ---
  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    fetchJobs(false);
  };

  // --- Event handlers ---
  const handleTradeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTrade(e.target.value as Trade);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleToggle = () => {
    setShowWithin35km((prev) => !prev);
  };

  // --- Render ---
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

        <div className={styles.filterGroup}>
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showWithin35km}
              onChange={handleToggle}
              className={styles.checkbox}
            />
            Show jobs within 35km only
          </label>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className={styles.empty}>No jobs found in your area.</div>
      ) : (
        <div className={styles.jobList}>
          {jobs.map((job) => (
            <BrowseJobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className={styles.loadMore}>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className={styles.loadMoreButton}
          >
            {loadingMore ? 'Loading more...' : 'Load more jobs'}
          </button>
        </div>
      )}
    </div>
  );
};