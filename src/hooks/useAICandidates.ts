import { useEffect, useState } from 'react';
import { aiApi } from '../api/endpoints';
import type { AICandidatesResponse } from '../api/types';

interface UseAICandidatesReturn {
  candidates: AICandidatesResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAICandidates(): UseAICandidatesReturn {
  const [candidates, setCandidates] = useState<AICandidatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await aiApi.getCandidates();
      if (result.success && result.data) {
        setCandidates(result.data);
      } else {
        setError(result.error || 'Failed to load AI candidates');
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

  return { candidates, loading, error, refetch: fetchData };
}