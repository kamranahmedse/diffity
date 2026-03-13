import { useState, useCallback } from 'react';

interface FileContent {
  path: string;
  content: string[];
}

interface UseFileResult {
  data: FileContent | null;
  loading: boolean;
  error: string | null;
  fetchFile: (path: string, ref?: string) => void;
}

export function useFile(): UseFileResult {
  const [data, setData] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFile = useCallback((path: string, ref?: string) => {
    setLoading(true);
    setError(null);
    const url = ref
      ? `/api/file/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`
      : `/api/file/${encodeURIComponent(path)}`;
    fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(json => {
        setData(json as FileContent);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { data, loading, error, fetchFile };
}
