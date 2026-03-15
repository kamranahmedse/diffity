import { createContext, useContext, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CommentThread, CommentAuthor, CommentSide, LineSelection } from '../types/comment';
import { useReviewThreads } from '../hooks/use-review-threads';
import * as api from '../lib/api';

interface CommentsContextValue {
  threads: CommentThread[];
  addThread: (filePath: string, side: CommentSide, startLine: number, endLine: number, body: string, author: CommentAuthor, anchorContent?: string) => void;
  addReply: (threadId: string, body: string, author: CommentAuthor) => void;
  resolveThread: (threadId: string) => void;
  unresolveThread: (threadId: string) => void;
  dismissThread: (threadId: string) => void;
  deleteComment: (threadId: string, commentId: string) => void;
  deleteThread: (threadId: string) => void;
  getThreadsForFile: (filePath: string) => CommentThread[];
  getThreadForLine: (filePath: string, side: CommentSide, line: number) => CommentThread | undefined;
  pendingSelection: LineSelection | null;
  setPendingSelection: (selection: LineSelection | null) => void;
  enabled: boolean;
}

const CommentsContext = createContext<CommentsContextValue | null>(null);

interface CommentsProviderProps {
  children: React.ReactNode;
  sessionId: string | null;
  enabled: boolean;
}

export function CommentsProvider(props: CommentsProviderProps) {
  const { children, sessionId, enabled } = props;
  const [pendingSelection, setPendingSelection] = useState<LineSelection | null>(null);
  const queryClient = useQueryClient();
  const { data: serverThreads } = useReviewThreads(enabled ? sessionId : null);

  const threads = enabled && serverThreads ? serverThreads : [];

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
    setPendingSelection(null);
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

  const getThreadsForFile = useCallback((filePath: string) => {
    return threads.filter(t => t.filePath === filePath);
  }, [threads]);

  const getThreadForLine = useCallback((filePath: string, side: CommentSide, line: number) => {
    return threads.find(t =>
      t.filePath === filePath &&
      t.side === side &&
      line >= t.startLine &&
      line <= t.endLine
    );
  }, [threads]);

  const value: CommentsContextValue = {
    threads,
    addThread,
    addReply,
    resolveThread,
    unresolveThread,
    dismissThread,
    deleteComment,
    deleteThread,
    getThreadsForFile,
    getThreadForLine,
    pendingSelection,
    setPendingSelection,
    enabled,
  };

  return (
    <CommentsContext value={value}>
      {children}
    </CommentsContext>
  );
}

export function useComments(): CommentsContextValue {
  const ctx = useContext(CommentsContext);
  if (!ctx) {
    throw new Error('useComments must be used within CommentsProvider');
  }
  return ctx;
}
