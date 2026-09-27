import { useCallback, useEffect, useState } from 'react';

/** Pequeno hook para carregar dados com estados de loading/erro e recarregar. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);

  useEffect(() => {
    let active = true;
    setLoading(true);
    load()
      .then((value) => active && (setData(value), setError(null)))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : 'Ocorreu um erro.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [load, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, loading, reload, setData };
}
