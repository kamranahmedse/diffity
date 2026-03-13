import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('diffity-theme') as Theme | null;
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => getStoredTheme() || getSystemTheme()
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (!getStoredTheme()) {
        setTheme(getSystemTheme());
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('diffity-theme', next);
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
