import { queryOptions } from '@tanstack/react-query';
import { fetchOverview } from '../lib/api.js';

export function overviewOptions() {
  return queryOptions({
    queryKey: ['overview'],
    queryFn: fetchOverview,
  });
}
