import { useQuery } from '@tanstack/react-query';
import { repoInfoOptions } from '../queries/info.js';

export function useInfo() {
  const { data, isLoading, error } = useQuery(repoInfoOptions());

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
