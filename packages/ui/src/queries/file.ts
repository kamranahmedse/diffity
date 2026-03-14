import { queryOptions } from '@tanstack/react-query';
import { fetchFileContent } from '../lib/api.js';

export function fileContentOptions(filePath: string, enabled: boolean, ref?: string) {
  return queryOptions({
    queryKey: ['file-content', filePath, ref],
    queryFn: () => fetchFileContent(filePath, ref),
    enabled,
  });
}
