import { useQuery } from '@tanstack/react-query';
import { fetchThreads } from '../lib/api.js';
import type { CommentThread } from '../types/comment.js';

export function useReviewThreads(sessionId: string | null | undefined) {
  return useQuery<CommentThread[]>({
    queryKey: ['threads', sessionId],
    queryFn: () => fetchThreads(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 2000,
  });
}
