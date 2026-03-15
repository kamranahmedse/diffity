import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CommentAuthor, CommentSide } from '../types/comment';
import * as api from '../lib/api';

export function useCommentActions(sessionId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();

  const invalidateThreads = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['threads', sessionId] });
  }, [queryClient, sessionId]);

  const addThread = useCallback((filePath: string, side: CommentSide, startLine: number, endLine: number, body: string, author: CommentAuthor, anchorContent?: string) => {
    if (!enabled || !sessionId) {
      return;
    }
    api.createThread({ sessionId, filePath, side, startLine, endLine, body, author, anchorContent }).then(() => {
      invalidateThreads();
    });
  }, [enabled, sessionId, invalidateThreads]);

  const addReply = useCallback((threadId: string, body: string, author: CommentAuthor) => {
    if (!enabled) {
      return;
    }
    api.replyToThread(threadId, body, author).then(() => {
      invalidateThreads();
    });
  }, [enabled, invalidateThreads]);

  const resolveThread = useCallback((threadId: string) => {
    if (!enabled) {
      return;
    }
    api.updateThreadStatus(threadId, 'resolved').then(() => {
      invalidateThreads();
    });
  }, [enabled, invalidateThreads]);

  const unresolveThread = useCallback((threadId: string) => {
    if (!enabled) {
      return;
    }
    api.updateThreadStatus(threadId, 'open').then(() => {
      invalidateThreads();
    });
  }, [enabled, invalidateThreads]);

  const dismissThread = useCallback((threadId: string) => {
    if (!enabled) {
      return;
    }
    api.updateThreadStatus(threadId, 'dismissed').then(() => {
      invalidateThreads();
    });
  }, [enabled, invalidateThreads]);

  const deleteComment = useCallback((threadId: string, commentId: string) => {
    if (!enabled) {
      return;
    }
    api.deleteComment(commentId).then(() => {
      invalidateThreads();
    });
  }, [enabled, invalidateThreads]);

  const deleteThread = useCallback((threadId: string) => {
    if (!enabled) {
      return;
    }
    api.deleteThread(threadId).then(() => {
      invalidateThreads();
    });
  }, [enabled, invalidateThreads]);

  const deleteAllThreads = useCallback(() => {
    if (!enabled || !sessionId) {
      return;
    }
    api.deleteAllThreads(sessionId).then(() => {
      invalidateThreads();
    });
  }, [enabled, sessionId, invalidateThreads]);

  return {
    addThread,
    addReply,
    resolveThread,
    unresolveThread,
    dismissThread,
    deleteComment,
    deleteThread,
    deleteAllThreads,
  };
}

export type CommentActions = ReturnType<typeof useCommentActions>;
