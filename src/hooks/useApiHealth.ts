import { useEffect, useState } from 'react';
import { healthApi } from '../api/endpoints';

interface UseApiHealthReturn {
  online: boolean;
  loading: boolean;
  check: () => Promise<void>;
}

export function useApiHealth(): UseApiHealthReturn {
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = async () => {
    setLoading(true);
    try {
      const result = await healthApi.check();
      setOnline(result.success);
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
  }, []);

  return { online, loading, check };
}