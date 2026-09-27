import { useEffect, useState } from 'react';
import { unitsApi } from '../api/endpoints';
import type { UnitResponse, PropertyDetailResponse, UnitHistoryResponse, UnitGeometryUpdateRequest, UnitGeometryUpdateResponse } from '../api/types';

interface UseUnitsReturn {
  units: UnitResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUnits(): UseUnitsReturn {
  const [units, setUnits] = useState<UnitResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await unitsApi.list();
      if (result.success && result.data) {
        setUnits(result.data);
      } else {
        setError(result.error || 'Failed to load units');
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

  return { units, loading, error, refetch: fetchData };
}

interface UseUnitReturn {
  unit: UnitResponse | null;
  loading: boolean;
  error: string | null;
}

export function useUnit(id: string): UseUnitReturn {
  const [unit, setUnit] = useState<UnitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await unitsApi.get(id);
        if (active) {
          if (result.success && result.data) {
            setUnit(result.data);
          } else {
            setError(result.error || 'Failed to load unit');
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

  return { unit, loading, error };
}

interface UsePropertyDetailReturn {
  property: PropertyDetailResponse | null;
  loading: boolean;
  error: string | null;
}

export function usePropertyDetail(id: string): UsePropertyDetailReturn {
  const [property, setProperty] = useState<PropertyDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await unitsApi.getDetail(id);
        if (active) {
          if (result.success && result.data) {
            setProperty(result.data);
          } else {
            setError(result.error || 'Failed to load property detail');
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

  return { property, loading, error };
}

interface UseUnitHistoryReturn {
  history: UnitHistoryResponse | null;
  loading: boolean;
  error: string | null;
}

export function useUnitHistory(id: string): UseUnitHistoryReturn {
  const [history, setHistory] = useState<UnitHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await unitsApi.getHistory(id);
        if (active) {
          if (result.success && result.data) {
            setHistory(result.data);
          } else {
            setError(result.error || 'Failed to load unit history');
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

  return { history, loading, error };
}

interface UseUnitGeometryUpdateReturn {
  update: (id: string, request: UnitGeometryUpdateRequest) => Promise<UnitGeometryUpdateResponse | null>;
  loading: boolean;
  error: string | null;
}

export function useUnitGeometryUpdate(): UseUnitGeometryUpdateReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (id: string, request: UnitGeometryUpdateRequest): Promise<UnitGeometryUpdateResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await unitsApi.updateGeometry(id, request);
      if (result.success && result.data) {
        setLoading(false);
        return result.data;
      } else {
        setError(result.error || 'Failed to update unit geometry');
        setLoading(false);
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
      return null;
    }
  };

  return { update, loading, error };
}