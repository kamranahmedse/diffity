import { useQuery } from '@tanstack/react-query';
import { repoInfoOptions } from '../queries/info';

export function useInfo(ref?: string) {
  const { data, isLoading, error } = useQuery(repoInfoOptions(ref));

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
