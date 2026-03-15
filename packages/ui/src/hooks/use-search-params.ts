import { useState, useEffect } from 'react';

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

  return { ref };
}
