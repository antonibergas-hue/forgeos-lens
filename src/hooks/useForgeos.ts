
import { useState, useEffect, useCallback } from 'react';
import { runForgeos, ForgeosResult } from '../lib/forgeos';

interface UseForgeosOptions {
  args: string[];
  skip?: boolean;
}

export function useForgeos<T>({ args, skip }: UseForgeosOptions) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ForgeosResult<T> | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setData(null);
    setResult(null);

    try {
      const res = await runForgeos<T>(args);
      setResult(res);
      if (res.ok && res.parsed) {
        setData(res.parsed);
      } else if (!res.ok) {
        setError(res.stderr || `forgeos exited with code ${res.code}`);
      }
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [args]);

  useEffect(() => {
    if (!skip) {
      execute();
    }
  }, [execute, skip]);

  return { data, error, isLoading, result, refetch: execute };
}
