import { useState, useEffect } from 'react';

interface RepoInfo {
  name: string;
  branch: string;
  root: string;
  description: string;
}

interface UseInfoResult {
  data: RepoInfo | null;
  loading: boolean;
  error: string | null;
}

export function useInfo(): UseInfoResult {
  const [data, setData] = useState<RepoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/info')
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(json => {
        setData(json as RepoInfo);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}
