import { useState, useRef, useEffect } from 'react';
import type { CommentThread as CommentThreadType, CommentAuthor } from '../types/comment';
import { isThreadResolved } from '../types/comment';
import type { CommentActions } from '../hooks/use-comment-actions';
import { CommentForm } from './comment-form';
import { CommentIcon } from './icons/comment-icon';
import { TrashIcon } from './icons/trash-icon';
import { MarkdownContent } from './markdown-content';
import { ThreadBadge } from './ui/thread-badge';

const DEFAULT_AUTHOR: CommentAuthor = { name: 'You', type: 'user' };

interface PathCommentsProps {
  pathKey: string;
  threads: CommentThreadType[];
  commentActions: CommentActions;
  label: string;
}

export function PathComments(props: PathCommentsProps) {
  const { pathKey, threads, commentActions, label } = props;
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowForm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSubmit = (body: string) => {
    commentActions.addThread(`__path__:${pathKey}`, 'new', 0, 0, body, DEFAULT_AUTHOR);
    setShowForm(false);
  };

  const handleOpen = () => {
    setOpen(true);
    if (threads.length === 0) {
      setShowForm(true);
    }
  };

  return (
    <div className="relative inline-flex" ref={popoverRef}>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-text-muted hover:text-accent hover:bg-hover transition-colors cursor-pointer"
        title={`Comment on ${label}`}
      >
        <CommentIcon className="w-3.5 h-3.5" />
        {threads.length > 0 && (
          <span className="text-[10px] font-semibold text-accent leading-none">{threads.length}</span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-80 max-h-[400px] overflow-y-auto bg-bg-secondary rounded-lg shadow-lg ring-1 ring-border z-50">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
            <span className="text-[11px] text-text-muted">
              {label}
            </span>
            <div className="flex-1" />
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="text-[11px] text-accent hover:text-accent-hover transition-colors cursor-pointer"
              >
                Add comment
              </button>
            )}
          </div>

          <div className="p-1.5 space-y-1">
            {showForm && (
              <div className="p-1">
                <CommentForm
                  onSubmit={handleSubmit}
                  onCancel={() => {
                    setShowForm(false);
                    if (threads.length === 0) {
                      setOpen(false);
                    }
                  }}
                  placeholder={`Comment on ${label}...`}
                  submitLabel="Comment"
                />
              </div>
            )}
            {threads.map(thread => (
              <PathThreadCard
                key={thread.id}
                thread={thread}
                onReply={(body) => commentActions.addReply(thread.id, body, DEFAULT_AUTHOR)}
                onResolve={() => commentActions.resolveThread(thread.id)}
                onUnresolve={() => commentActions.unresolveThread(thread.id)}
                onEditComment={(commentId, body) => commentActions.editComment(commentId, body)}
                onDeleteComment={(commentId) => commentActions.deleteComment(thread.id, commentId)}
                onDeleteThread={() => commentActions.deleteThread(thread.id)}
              />
            ))}
            {threads.length === 0 && !showForm && (
              <div className="py-2 text-center text-xs text-text-muted">No comments yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PathThreadCardProps {
  thread: CommentThreadType;
  onReply: (body: string) => void;
  onResolve: () => void;
  onUnresolve: () => void;
  onEditComment: (commentId: string, body: string) => void;
  onDeleteComment: (commentId: string) => void;
  onDeleteThread: () => void;
}

function PathThreadCard(props: PathThreadCardProps) {
  const { thread, onReply, onResolve, onUnresolve, onEditComment, onDeleteComment, onDeleteThread } = props;
  const [showReply, setShowReply] = useState(false);
  const resolved = isThreadResolved(thread);

  return (
    <div className="rounded-md bg-bg p-2 group/card" data-thread-id={thread.id}>
      {thread.comments.map((comment, i) => (
        <div key={comment.id} className={i > 0 ? 'mt-2 pt-2 border-t border-border' : ''}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[11px] font-semibold text-text">{comment.author.name}</span>
            {comment.author.type === 'agent' && (
              <span className="text-[9px] px-1 py-px rounded-full bg-accent/15 text-accent font-medium">bot</span>
            )}
            <span className="text-[10px] text-text-muted">{formatTime(comment.createdAt)}</span>
            {i === 0 && (
              <div className="ml-auto flex items-center gap-1">
                {resolved && <ThreadBadge variant="resolved" />}
              </div>
            )}
          </div>
          <div className="text-[13px] text-text">
            <MarkdownContent content={comment.body} />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-border">
        {showReply ? (
          <div className="w-full">
            <CommentForm
              onSubmit={(body) => {
                onReply(body);
                setShowReply(false);
              }}
              onCancel={() => setShowReply(false)}
              placeholder="Reply..."
              submitLabel="Reply"
            />
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowReply(true)}
              className="text-[11px] text-accent hover:text-accent-hover transition-colors cursor-pointer"
            >
              Reply
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
              {resolved ? (
                <button
                  onClick={onUnresolve}
                  className="text-[11px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                >
                  Reopen
                </button>
              ) : (
                <button
                  onClick={onResolve}
                  className="text-[11px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
                >
                  Resolve
                </button>
              )}
              <button
                onClick={onDeleteThread}
                className="text-text-muted hover:text-deleted transition-colors cursor-pointer"
                title="Delete"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) {
    return 'just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHr < 24) {
    return `${diffHr}h ago`;
  }
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }
  return date.toLocaleDateString();
}
