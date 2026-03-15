import type { Comment, CommentThread as CommentThreadType } from '../types/comment';
import { parseSuggestion } from '../lib/parse-suggestion';
import { TrashIcon } from './icons/trash-icon';
import { SuggestionDiff } from './suggestion-diff';
import { MarkdownContent } from './markdown-content';

interface CommentBubbleProps {
  comment: Comment;
  onDelete: () => void;
  thread?: CommentThreadType;
  originalCode?: string;
  canApply?: boolean;
  onApply?: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) {
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

function AuthorAvatar(props: { name: string; avatarUrl?: string; type: 'user' | 'agent' }) {
  const { name, avatarUrl, type } = props;

  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} className="w-5 h-5 rounded-full" />
    );
  }

  const bgColor = type === 'agent' ? 'bg-accent' : 'bg-text-muted';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={`w-5 h-5 rounded-full ${bgColor} flex items-center justify-center text-white text-[10px] font-medium`}>
      {initial}
    </div>
  );
}

export function CommentBubble(props: CommentBubbleProps) {
  const { comment, onDelete, thread, originalCode, canApply, onApply } = props;
  const parsed = parseSuggestion(comment.body);

  return (
    <div className="px-3 py-2 border-b border-border last:border-b-0 group">
      <div className="flex items-center gap-2 mb-1">
        <AuthorAvatar name={comment.author.name} avatarUrl={comment.author.avatarUrl} type={comment.author.type} />
        <span className="text-xs font-semibold text-text">{comment.author.name}</span>
        {comment.author.type === 'agent' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-medium">bot</span>
        )}
        <span className="text-[11px] text-text-muted">{formatRelativeTime(comment.createdAt)}</span>
        <button
          onClick={onDelete}
          className="ml-auto text-text-muted hover:text-deleted opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="Delete comment"
        >
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="text-sm text-text pl-7">
        {parsed ? (
          <>
            {parsed.before && <MarkdownContent content={parsed.before} />}
            {thread && originalCode !== undefined && (
              <SuggestionDiff
                originalCode={originalCode}
                suggestion={parsed.suggestion}
                filePath={thread.filePath}
                canApply={canApply}
                onApply={onApply}
                thread={thread}
              />
            )}
            {parsed.after && <MarkdownContent content={parsed.after} />}
          </>
        ) : (
          <MarkdownContent content={comment.body} />
        )}
      </div>
    </div>
  );
}
