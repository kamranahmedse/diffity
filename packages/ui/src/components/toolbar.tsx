import type { ParsedDiff } from '@diffity/parser';
import { cn } from '../lib/cn.js';
import { useCopy } from '../hooks/use-copy.js';
import { useComments } from '../context/comments-context.js';
import { getFilePath } from '../lib/diff-utils.js';
import { CopyIcon } from './icons/copy-icon.js';
import { CheckIcon } from './icons/check-icon.js';
import type { ViewMode } from '../lib/diff-utils.js';
import type { CommentThread } from '../types/comment.js';

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  hideWhitespace: boolean;
  onHideWhitespaceChange: (hide: boolean) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  diff?: ParsedDiff;
}

function extractCodeContext(diff: ParsedDiff | undefined, filePath: string, side: 'old' | 'new', startLine: number, endLine: number): string[] {
  if (!diff) {
    return [];
  }

  const file = diff.files.find(f => getFilePath(f) === filePath);
  if (!file) {
    return [];
  }

  const lines: string[] = [];
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      const lineNum = side === 'old' ? line.oldLineNumber : line.newLineNumber;
      if (lineNum !== null && lineNum >= startLine && lineNum <= endLine) {
        const prefix = line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' ';
        lines.push(`${prefix} ${line.content}`);
      }
    }
  }

  return lines;
}

function formatThreadsForCopy(threads: CommentThread[], diff?: ParsedDiff): string {
  if (threads.length === 0) {
    return '';
  }

  const grouped = new Map<string, CommentThread[]>();
  for (const thread of threads) {
    const existing = grouped.get(thread.filePath) || [];
    existing.push(thread);
    grouped.set(thread.filePath, existing);
  }

  const parts: string[] = [];
  for (const [filePath, fileThreads] of grouped) {
    parts.push(`## ${filePath}`);
    for (const thread of fileThreads) {
      const lineRange = thread.startLine === thread.endLine
        ? `${thread.startLine}`
        : `${thread.startLine}-${thread.endLine}`;
      const sideDesc = thread.side === 'old' ? 'old' : 'new';
      const resolved = thread.isResolved ? ' (resolved)' : '';

      parts.push(`### Line ${lineRange} (${sideDesc})${resolved}`);

      const codeLines = extractCodeContext(diff, filePath, thread.side, thread.startLine, thread.endLine);
      if (codeLines.length > 0) {
        parts.push('```diff');
        parts.push(...codeLines);
        parts.push('```');
      }

      const uniqueAuthors = new Set(thread.comments.map(c => c.author.name));
      const singleAuthor = uniqueAuthors.size === 1;

      for (const comment of thread.comments) {
        if (singleAuthor) {
          parts.push(comment.body);
        } else {
          const authorName = comment.author.name === 'You' ? 'User' : comment.author.name;
          parts.push(`**${authorName}:** ${comment.body}`);
        }
      }
      parts.push('');
    }
  }

  return parts.join('\n');
}

export function Toolbar(props: ToolbarProps) {
  const {
    viewMode,
    onViewModeChange,
    hideWhitespace,
    onHideWhitespaceChange,
    theme,
    onToggleTheme,
    diff,
  } = props;

  const { threads } = useComments();
  const { copied, copy } = useCopy();

  const baseBtn = 'px-3 py-1 border border-border text-sm text-text-secondary transition-colors duration-150 cursor-pointer';
  const activeBtn = 'bg-accent text-white border-accent';
  const inactiveBtn = 'bg-bg hover:bg-hover hover:text-text';

  const unresolvedCount = threads.filter(t => !t.isResolved).length;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-bg-secondary border-b border-border font-sans text-sm">
      <div className="flex items-center gap-px">
        <button
          className={cn(baseBtn, 'rounded-l-md', viewMode === 'unified' ? activeBtn : inactiveBtn)}
          onClick={() => onViewModeChange('unified')}
          title="Unified view (u)"
        >
          Unified
        </button>
        <button
          className={cn(baseBtn, 'rounded-r-md border-l-0', viewMode === 'split' ? activeBtn : inactiveBtn)}
          onClick={() => onViewModeChange('split')}
          title="Split view (s)"
        >
          Split
        </button>
      </div>
      <div className="flex items-center gap-px">
        <label className="flex items-center gap-2 text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={hideWhitespace}
            onChange={e => onHideWhitespaceChange(e.target.checked)}
            className="cursor-pointer"
          />
          <span>Hide whitespace</span>
        </label>
      </div>
      <div className="flex items-center gap-px">
        <button
          className={cn(baseBtn, 'rounded-md', inactiveBtn)}
          onClick={onToggleTheme}
          title="Toggle theme"
        >
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
      {threads.length > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-text-muted">
            {unresolvedCount} comment{unresolvedCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => copy(formatThreadsForCopy(threads, diff))}
            className={cn(baseBtn, 'rounded-md flex items-center gap-1.5', inactiveBtn)}
            title="Copy all comments to clipboard"
          >
            {copied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-added" />
                Copied
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                Copy comments
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
