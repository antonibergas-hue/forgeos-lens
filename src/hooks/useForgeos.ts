
import { useState, useEffect, useCallback } from 'react';
import { runForgeos, ForgeosResult } from '../lib/forgeos';
import { useDebouncedError } from './useDebouncedError';

interface UseForgeosOptions {
  args: string[];
  skip?: boolean;
}

export function useForgeos<T>({ args, skip }: UseForgeosOptions) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ForgeosResult<T> | null>(null);
  const notifyError = useDebouncedError();

  // Key the callback on the args *content*, not the array identity. Callers
  // pass inline literals (`args: ["list", "--json"]`), which are a new
  // reference every render; depending on the array directly would recreate
  // `execute` each render and drive the effect into an infinite refetch loop.
  const argsKey = JSON.stringify(args);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await runForgeos<T>(JSON.parse(argsKey) as string[]);
      setResult(res);
      if (res.ok && res.parsed) {
        setData(res.parsed);
      } else if (!res.ok) {
        const msg = res.stderr || `forgeos exited with code ${res.code}`;
        setError(msg);
        notifyError(msg);
      }
    } catch (e: any) {
      const msg = e.message || 'An unknown error occurred';
      setError(msg);
      notifyError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [argsKey, notifyError]);

  useEffect(() => {
    if (!skip) {
      execute();
    }
  }, [execute, skip]);

  return { data, error, isLoading, result, refetch: execute };
}
