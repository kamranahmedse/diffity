import { useState, useEffect } from 'react';

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    ref: params.get('ref'),
    theme: params.get('theme') as 'light' | 'dark' | null,
    view: params.get('view') as 'split' | 'unified' | null,
  };
}

export function useSearchParams() {
  const [values, setValues] = useState(getParams);

  useEffect(() => {
    const handler = () => {
      setValues(getParams());
    };
    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
    };
  }, []);

  return values;
}
