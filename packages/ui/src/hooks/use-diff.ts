import { useQuery } from '@tanstack/react-query';
import { diffOptions } from '../queries/diff.js';

export function useDiff(hideWhitespace = false) {
  const { data, isLoading, error } = useQuery(diffOptions(hideWhitespace));

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
