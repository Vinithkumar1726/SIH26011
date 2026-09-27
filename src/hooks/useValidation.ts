import { useEffect, useState } from 'react';
import { validationApi } from '../api/endpoints';
import type { ValidationResult } from '../api/types';

interface UseValidationReturn {
  result: ValidationResult | null;
  loading: boolean;
  error: string | null;
  run: () => Promise<void>;
}

export function useValidation(): UseValidationReturn {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await validationApi.run();
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || 'Validation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, run };
}