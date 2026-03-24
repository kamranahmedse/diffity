import { useState } from 'react';
import type { CommentThread as CommentThreadType } from '../types/comment';
import { isThreadResolved } from '../types/comment';
import { CommentBubble } from './comment-bubble';
import { CommentForm } from './comment-form';
import { TrashIcon } from './icons/trash-icon';
import { cn } from '../lib/cn';

interface ThreadCardProps {
  thread: CommentThreadType;
  onEditComment: (commentId: string, body: string) => void;
  onDeleteComment: (commentId: string) => void;
  onDeleteThread: () => void;
  onReply?: (body: string) => void;
  onResolve?: () => void;
  onUnresolve?: () => void;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function ThreadCard(props: ThreadCardProps) {
  const {
    thread,
    onEditComment,
    onDeleteComment,
    onDeleteThread,
    onReply,
    onResolve,
    onUnresolve,
    headerLeft,
    headerRight,
    className,
    children,
  } = props;
  const [showReply, setShowReply] = useState(false);
  const resolved = isThreadResolved(thread);

  return (
    <div className={cn('rounded-lg overflow-hidden', className)} data-thread-id={thread.id}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2">
          {headerLeft}
        </div>
        <div className="flex items-center gap-1">
          {onResolve && onUnresolve && (
            resolved ? (
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
            )
          )}
          {headerRight}
          <button
            onClick={onDeleteThread}
            className="text-text-muted hover:text-deleted transition-colors cursor-pointer ml-1"
            title="Delete thread"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {children}
      <div className="px-1.5">
        {thread.comments.map((comment) => (
          <CommentBubble
            key={comment.id}
            comment={comment}
            onEdit={(body) => onEditComment(comment.id, body)}
            onDelete={() => onDeleteComment(comment.id)}
          />
        ))}
      </div>
      {onReply && (
        showReply ? (
          <div className="px-3 pb-2">
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
          <div className="px-4 pb-2">
            <button
              onClick={() => setShowReply(true)}
              className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
            >
              Reply
            </button>
          </div>
        )
      )}
    </div>
  );
}
