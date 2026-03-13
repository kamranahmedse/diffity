import { useState, useEffect } from 'react';
import type { ParsedDiff } from '@diffity/parser';

interface UseDiffResult {
  data: ParsedDiff | null;
  loading: boolean;
  error: string | null;
  refetch: (hideWhitespace?: boolean) => void;
}

export function useDiff(hideWhitespace = false): UseDiffResult {
  const [data, setData] = useState<ParsedDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiff = (ws?: boolean) => {
    const hide = ws ?? hideWhitespace;
    setLoading(true);
    setError(null);
    const url = hide ? '/api/diff?whitespace=hide' : '/api/diff';
    fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(json => {
        setData(json as ParsedDiff);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDiff();
  }, [hideWhitespace]);

  return { data, loading, error, refetch: fetchDiff };
}
