import { queryOptions } from '@tanstack/react-query';
import { fetchFileContent } from '../lib/api.js';

export function fileContentOptions(filePath: string, enabled: boolean) {
  return queryOptions({
    queryKey: ['file-content', filePath],
    queryFn: () => fetchFileContent(filePath),
    enabled,
  });
}
