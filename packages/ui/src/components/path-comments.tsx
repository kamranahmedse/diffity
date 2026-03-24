import { useState, useRef, useEffect } from 'react';
import type { CommentThread as CommentThreadType } from '../types/comment';
import { isThreadResolved, DEFAULT_AUTHOR } from '../types/comment';
import type { CommentActions } from '../hooks/use-comment-actions';
import { CommentForm } from './comment-form';
import { CommentIcon } from './icons/comment-icon';
import { ThreadBadge } from './ui/thread-badge';
import { ThreadCard } from './thread-card';

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
        <div className="absolute left-0 top-full mt-1 w-80 max-h-100 overflow-y-auto bg-bg-secondary rounded-lg shadow-lg border border-border z-50">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
            <span className="text-[11px] text-text-muted truncate">{label}</span>
            <div className="flex-1" />
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="text-[11px] text-accent hover:text-accent-hover transition-colors cursor-pointer shrink-0"
              >
                Add comment
              </button>
            )}
          </div>

          {showForm && (
            <div className="px-2 py-2">
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

          <div className="p-1.5 space-y-1.5">
            {threads.map(thread => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                onReply={(body) => commentActions.addReply(thread.id, body, DEFAULT_AUTHOR)}
                onResolve={() => commentActions.resolveThread(thread.id)}
                onUnresolve={() => commentActions.unresolveThread(thread.id)}
                onEditComment={(commentId, body) => commentActions.editComment(commentId, body)}
                onDeleteComment={(commentId) => commentActions.deleteComment(thread.id, commentId)}
                onDeleteThread={() => commentActions.deleteThread(thread.id)}
                className="bg-bg-tertiary"
                headerLeft={isThreadResolved(thread) && <ThreadBadge variant="resolved" />}
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
