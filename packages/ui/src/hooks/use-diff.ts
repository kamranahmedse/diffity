import { useState, useEffect, useCallback, useRef } from 'react';
import type { ParsedDiff } from '@diffity/parser';

interface UseDiffResult {
  data: ParsedDiff | null;
  loading: boolean;
  error: string | null;
}

export function useDiff(hideWhitespace = false): UseDiffResult {
  const [data, setData] = useState<ParsedDiff | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstFetch = useRef(true);

  useEffect(() => {
    const url = hideWhitespace ? '/api/diff?whitespace=hide' : '/api/diff';

    if (isFirstFetch.current) {
      setLoading(true);
      isFirstFetch.current = false;
    }

    setError(null);

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
  }, [hideWhitespace]);

  return { data, loading, error };
}
