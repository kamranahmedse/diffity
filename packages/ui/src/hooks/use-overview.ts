import { useQuery } from '@tanstack/react-query';
import { overviewOptions } from '../queries/overview.js';

export function useOverview() {
  const { data, isLoading, error } = useQuery(overviewOptions());

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}
