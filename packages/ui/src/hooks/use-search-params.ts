import { useState, useEffect, useCallback } from 'react';

function getRefFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref');
}

export function useSearchParams() {
  const [ref, setRef] = useState<string | null>(getRefFromUrl);

  useEffect(() => {
    const handler = () => {
      setRef(getRefFromUrl());
    };
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
    };
  }, []);

  const navigate = useCallback((newRef: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('ref', newRef);
    history.pushState({}, '', url.toString());
    setRef(newRef);
  }, []);

  const goHome = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete('ref');
    history.pushState({}, '', url.toString());
    setRef(null);
  }, []);

  return { ref, navigate, goHome };
}
