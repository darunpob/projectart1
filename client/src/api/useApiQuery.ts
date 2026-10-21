import { useCallback, useEffect, useState } from 'react';

export interface QueryState<T> {
  value: T | null;
  error: Error | null;
  loading: boolean;
  reload: () => void;
}

export function useApiQuery<T>(load: () => Promise<T>, deps: readonly unknown[]): QueryState<T> {
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then((loaded) => {
        if (cancelled) return;
        setValue(loaded);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause : new Error(String(cause)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  return { value, error, loading, reload };
}
