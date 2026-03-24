import { useState } from 'react';
import type { CommentThread as CommentThreadType, CommentAuthor } from '../types/comment';
import { isThreadResolved } from '../types/comment';
import type { CommentActions } from '../hooks/use-comment-actions';
import { CommentBubble } from './comment-bubble';
import { CommentForm } from './comment-form';
import { CommentIcon } from './icons/comment-icon';
import { TrashIcon } from './icons/trash-icon';
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
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (body: string) => {
    commentActions.addThread(`__path__:${pathKey}`, 'new', 0, 0, body, DEFAULT_AUTHOR);
    setShowForm(false);
  };

  if (threads.length === 0 && !showForm) {
    return (
      <div className="mb-3">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors cursor-pointer"
          title={`Add a comment on ${label}`}
        >
          <CommentIcon className="w-3.5 h-3.5" />
          Comment on {label}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg bg-accent/5 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <CommentIcon className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-text-secondary text-xs">Comments on <span className="font-medium">{label}</span></span>
        {threads.length > 0 && (
          <span className="text-xs font-medium bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">{threads.length}</span>
        )}
        <div className="flex-1" />
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
          >
            Add comment
          </button>
        )}
      </div>
      <div className="bg-bg rounded-md mx-1.5 mb-1.5">
        {showForm && (
          <div className="p-3">
            <CommentForm
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              placeholder={`Comment on ${label}...`}
              submitLabel="Comment"
            />
          </div>
        )}
        {threads.length > 0 && (
          <div className="p-3 space-y-3">
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
          </div>
        )}
      </div>
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
    <div className="rounded-lg overflow-hidden bg-bg-secondary" data-thread-id={thread.id}>
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          {resolved && <ThreadBadge variant="resolved" />}
        </div>
        <div className="flex items-center gap-1">
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
            className="text-text-muted hover:text-deleted transition-colors cursor-pointer ml-1"
            title="Delete thread"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="px-0.5">
        {thread.comments.map(comment => (
          <CommentBubble
            key={comment.id}
            comment={comment}
            onEdit={(body) => onEditComment(comment.id, body)}
            onDelete={() => onDeleteComment(comment.id)}
          />
        ))}
      </div>
      {showReply ? (
        <div className="px-3 py-2">
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
        <div className="px-3 py-1.5">
          <button
            onClick={() => setShowReply(true)}
            className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
          >
            Reply
          </button>
        </div>
      )}
    </div>
  );
}
