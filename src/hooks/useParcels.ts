import { useEffect, useState } from 'react';
import { parcelsApi } from '../api/endpoints';
import type { ParcelGeometry } from '../api/types';

interface UseParcelsReturn {
  parcels: ParcelGeometry[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useParcels(): UseParcelsReturn {
  const [parcels, setParcels] = useState<ParcelGeometry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await parcelsApi.list();
      if (result.success && result.data) {
        setParcels(result.data);
      } else {
        setError(result.error || 'Failed to load parcels');
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

  return { parcels, loading, error, refetch: fetchData };
}

interface UseParcelReturn {
  parcel: any | null;
  loading: boolean;
  error: string | null;
}

export function useParcel(id: string): UseParcelReturn {
  const [parcel, setParcel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await parcelsApi.get(id);
        if (active) {
          if (result.success && result.data) {
            setParcel(result.data);
          } else {
            setError(result.error || 'Failed to load parcel');
          }
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => { active = false; };
  }, [id]);

  return { parcel, loading, error };
}