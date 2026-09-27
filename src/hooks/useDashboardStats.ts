import { useEffect, useState } from 'react';
import { dashboardApi } from '../api/endpoints';
import type { DashboardStats } from '../api/types';

interface UseDashboardStatsReturn {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dashboardApi.getStatistics();
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        setError(result.error || 'Failed to load dashboard stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { stats, loading, error, refetch: fetchData };
}