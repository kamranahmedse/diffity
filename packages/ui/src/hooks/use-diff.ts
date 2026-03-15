import { useQuery } from '@tanstack/react-query';
import { diffOptions } from '../queries/diff';

export function useDiff(hideWhitespace = false, ref?: string) {
  const { data, isLoading, error } = useQuery(diffOptions(hideWhitespace, ref));

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
