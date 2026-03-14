import { queryOptions } from '@tanstack/react-query';
import { fetchRepoInfo } from '../lib/api.js';

export function repoInfoOptions() {
  return queryOptions({
    queryKey: ['repo-info'],
    queryFn: fetchRepoInfo,
  });
}
