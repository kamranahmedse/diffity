import { useState } from 'react';
import type { CommentThread as CommentThreadType } from '../types/comment';
import type { CommentAuthor, CommentSide } from '../types/comment';
import { isThreadResolved } from '../types/comment';
import { CommentForm } from './comment-form';
import { CommentBubble } from './comment-bubble';
import { TrashIcon } from './icons/trash-icon';
import { CommentIcon } from './icons/comment-icon';

interface CommentThreadProps {
  thread: CommentThreadType;
  onReply: (threadId: string, body: string, author: CommentAuthor) => void;
  onResolve: (threadId: string) => void;
  onUnresolve: (threadId: string) => void;
  onDeleteComment: (threadId: string, commentId: string) => void;
  onDeleteThread: (threadId: string) => void;
  currentAuthor: CommentAuthor;
  colSpan: number;
  viewMode?: 'unified' | 'split';
  side?: CommentSide;
  currentCode?: string;
}

function StatusBadge(props: { status: string }) {
  const { status } = props;

  switch (status) {
    case 'acknowledged':
      return <span className="px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] font-medium">Acknowledged</span>;
    case 'resolved':
      return <span className="px-1.5 py-0.5 rounded-full bg-added/20 text-added text-[10px] font-medium">Resolved</span>;
    case 'dismissed':
      return <span className="px-1.5 py-0.5 rounded-full bg-text-muted/20 text-text-muted text-[10px] font-medium line-through">Dismissed</span>;
    default:
      return null;
  }
}

export function CommentThread(props: CommentThreadProps) {
  const { thread, onReply, onResolve, onUnresolve, onDeleteComment, onDeleteThread, currentAuthor, colSpan, viewMode, side, currentCode } = props;
  const [showReply, setShowReply] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(isThreadResolved(thread));

  const isOutdated = thread.anchorContent && currentCode && thread.anchorContent !== currentCode;

  if (isCollapsed) {
    const collapsedContent = (
      <td colSpan={colSpan} className="px-4 py-2">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
        >
          <CommentIcon className="w-4 h-4" />
          <span>{thread.comments.length} comment{thread.comments.length !== 1 ? 's' : ''}</span>
          <StatusBadge status={thread.status} />
          {isOutdated && (
            <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-medium">Outdated</span>
          )}
        </button>
      </td>
    );

    if (viewMode === 'split') {
      return (
        <tr>
          {side === 'old' ? (
            <>{collapsedContent}<td colSpan={colSpan}></td></>
          ) : (
            <><td colSpan={colSpan}></td>{collapsedContent}</>
          )}
        </tr>
      );
    }

    return <tr>{collapsedContent}</tr>;
  }

  const lineLabel = thread.startLine === thread.endLine
    ? `Line ${thread.startLine}`
    : `Lines ${thread.startLine}–${thread.endLine}`;

  const resolved = isThreadResolved(thread);

  const threadContent = (
    <td colSpan={colSpan} className="px-4 py-3">
      <div className="border border-border rounded-lg overflow-hidden max-w-[700px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-bg-secondary border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted font-mono">{lineLabel}</span>
            <StatusBadge status={thread.status} />
            {isOutdated && (
              <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[10px] font-medium">Outdated</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {resolved ? (
              <button
                onClick={() => onUnresolve(thread.id)}
                className="text-[11px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
              >
                Reopen
              </button>
            ) : (
              <button
                onClick={() => {
                  onResolve(thread.id);
                  setIsCollapsed(true);
                }}
                className="text-[11px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
              >
                Resolve
              </button>
            )}
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-[11px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer ml-2"
            >
              Collapse
            </button>
            <button
              onClick={() => onDeleteThread(thread.id)}
              className="text-text-muted hover:text-deleted transition-colors cursor-pointer ml-1"
              title="Delete thread"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div>
          {thread.comments.map((comment) => (
            <CommentBubble
              key={comment.id}
              comment={comment}
              onDelete={() => onDeleteComment(thread.id, comment.id)}
            />
          ))}
        </div>
        {showReply ? (
          <div className="px-3 py-2 border-t border-border">
            <CommentForm
              onSubmit={(body) => {
                onReply(thread.id, body, currentAuthor);
                setShowReply(false);
              }}
              onCancel={() => setShowReply(false)}
              placeholder="Reply..."
              submitLabel="Reply"
            />
          </div>
        ) : (
          <div className="px-3 py-2 border-t border-border">
            <button
              onClick={() => setShowReply(true)}
              className="text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
            >
              Reply
            </button>
          </div>
        )}
      </div>
    </td>
  );

  if (viewMode === 'split') {
    return (
      <tr>
        {side === 'old' ? (
          <>{threadContent}<td colSpan={colSpan}></td></>
        ) : (
          <><td colSpan={colSpan}></td>{threadContent}</>
        )}
      </tr>
    );
  }

  return <tr>{threadContent}</tr>;
}
