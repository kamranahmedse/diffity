import { queryOptions } from '@tanstack/react-query';
import { fetchCommits } from '../lib/api.js';

export function commitsOptions() {
  return queryOptions({
    queryKey: ['commits'],
    queryFn: () => fetchCommits(0, 25),
  });
}
