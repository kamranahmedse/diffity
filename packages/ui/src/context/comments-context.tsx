import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { CommentThread, CommentAuthor, CommentSide, LineSelection } from '../types/comment.js';
import { fetchComments, saveComments } from '../lib/api.js';

interface CommentsContextValue {
  threads: CommentThread[];
  addThread: (filePath: string, side: CommentSide, startLine: number, endLine: number, body: string, author: CommentAuthor) => void;
  addReply: (threadId: string, body: string, author: CommentAuthor) => void;
  resolveThread: (threadId: string) => void;
  unresolveThread: (threadId: string) => void;
  deleteComment: (threadId: string, commentId: string) => void;
  deleteThread: (threadId: string) => void;
  getThreadsForFile: (filePath: string) => CommentThread[];
  getThreadForLine: (filePath: string, side: CommentSide, line: number) => CommentThread | undefined;
  pendingSelection: LineSelection | null;
  setPendingSelection: (selection: LineSelection | null) => void;
}

const CommentsContext = createContext<CommentsContextValue | null>(null);

let nextThreadId = 1;
let nextCommentId = 1;

function generateThreadId(): string {
  return `thread-${nextThreadId++}`;
}

function generateCommentId(): string {
  return `comment-${nextCommentId++}`;
}

export function CommentsProvider(props: { children: React.ReactNode }) {
  const { children } = props;
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [pendingSelection, setPendingSelection] = useState<LineSelection | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    fetchComments().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setThreads(data as CommentThread[]);
        let maxThread = 0;
        let maxComment = 0;
        for (const t of data as CommentThread[]) {
          const tNum = parseInt(t.id.replace('thread-', ''), 10);
          if (tNum > maxThread) {
            maxThread = tNum;
          }
          for (const c of t.comments) {
            const cNum = parseInt(c.id.replace('comment-', ''), 10);
            if (cNum > maxComment) {
              maxComment = cNum;
            }
          }
        }
        nextThreadId = maxThread + 1;
        nextCommentId = maxComment + 1;
      }
      initialLoadDone.current = true;
    });
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) {
      return;
    }
    saveComments(threads);
  }, [threads]);

  const addThread = useCallback((filePath: string, side: CommentSide, startLine: number, endLine: number, body: string, author: CommentAuthor) => {
    const thread: CommentThread = {
      id: generateThreadId(),
      filePath,
      side,
      startLine,
      endLine,
      isResolved: false,
      comments: [{
        id: generateCommentId(),
        author,
        body,
        createdAt: new Date().toISOString(),
      }],
    };
    setThreads(prev => [...prev, thread]);
    setPendingSelection(null);
  }, []);

  const addReply = useCallback((threadId: string, body: string, author: CommentAuthor) => {
    setThreads(prev => prev.map(thread => {
      if (thread.id !== threadId) {
        return thread;
      }
      return {
        ...thread,
        comments: [...thread.comments, {
          id: generateCommentId(),
          author,
          body,
          createdAt: new Date().toISOString(),
        }],
      };
    }));
  }, []);

  const resolveThread = useCallback((threadId: string) => {
    setThreads(prev => prev.map(thread => {
      if (thread.id !== threadId) {
        return thread;
      }
      return { ...thread, isResolved: true };
    }));
  }, []);

  const unresolveThread = useCallback((threadId: string) => {
    setThreads(prev => prev.map(thread => {
      if (thread.id !== threadId) {
        return thread;
      }
      return { ...thread, isResolved: false };
    }));
  }, []);

  const deleteComment = useCallback((threadId: string, commentId: string) => {
    setThreads(prev => {
      return prev.map(thread => {
        if (thread.id !== threadId) {
          return thread;
        }
        const remaining = thread.comments.filter(c => c.id !== commentId);
        if (remaining.length === 0) {
          return null;
        }
        return { ...thread, comments: remaining };
      }).filter(Boolean) as CommentThread[];
    });
  }, []);

  const deleteThread = useCallback((threadId: string) => {
    setThreads(prev => prev.filter(t => t.id !== threadId));
  }, []);

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
    deleteComment,
    deleteThread,
    getThreadsForFile,
    getThreadForLine,
    pendingSelection,
    setPendingSelection,
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
