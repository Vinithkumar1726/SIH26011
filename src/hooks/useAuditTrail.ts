import { useEffect, useState } from 'react';
import { auditApi } from '../api/endpoints';
import type { AuditLogEntry } from '../api/types';

interface UseAuditTrailReturn {
  logs: AuditLogEntry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAuditTrail(): UseAuditTrailReturn {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await auditApi.getTrail();
      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        setError(result.error || 'Failed to load audit trail');
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

  return { logs, loading, error, refetch: fetchData };
}