import { useCallback, useEffect, useRef, useState } from 'react';
import type { PageMeta } from '@tdc/shared';
import { ApiError } from '../lib/api';

export interface ApiState<T> {
  data: T | undefined;
  meta: PageMeta | undefined;
  error: ApiError | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (updater: (prev: T | undefined) => T | undefined) => void;
}

/**
 * Minimal data-fetching hook: runs `fetcher` whenever `key` changes, ignores stale responses,
 * and exposes `reload` for refreshing after mutations.
 */
export function useApi<T>(fetcher: () => Promise<{ data: T; meta?: PageMeta }>, key: string): ApiState<T> {
  const [data, setDataState] = useState<T>();
  const [meta, setMeta] = useState<PageMeta>();
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetcherRef.current();
      if (id !== requestId.current) return;
      setDataState(res.data);
      setMeta(res.meta);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN', 'Something went wrong.'));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [key, run]);

  const setData = useCallback((updater: (prev: T | undefined) => T | undefined) => setDataState(updater), []);
  return { data, meta, error, loading, reload: run, setData };
}

export function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
