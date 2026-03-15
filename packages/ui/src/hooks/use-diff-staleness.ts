import { useEffect, useRef, useState } from 'react';
import { fetchDiffFingerprint } from '../lib/api';

const POLL_INTERVAL = 3000;

export function useDiffStaleness(ref?: string, enabled = true) {
  const [isStale, setIsStale] = useState(false);
  const baselineRef = useRef<string | null>(null);

  function resetStaleness() {
    baselineRef.current = null;
    setIsStale(false);
  }

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    async function poll() {
      if (cancelled) {
        return;
      }

      try {
        const fingerprint = await fetchDiffFingerprint(ref);

        if (cancelled) {
          return;
        }

        if (baselineRef.current === null) {
          baselineRef.current = fingerprint;
        } else if (fingerprint !== baselineRef.current) {
          setIsStale(true);
        }
      } catch {
        // ignore fetch errors
      }

      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL);
      }
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [ref, enabled]);

  return { isStale, resetStaleness };
}
