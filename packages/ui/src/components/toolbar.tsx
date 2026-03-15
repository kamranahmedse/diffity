import { useState } from 'react';
import type { ParsedDiff } from '@diffity/parser';
import { cn } from '../lib/cn';
import { useCopy } from '../hooks/use-copy';
import { useThreadNavigation } from '../hooks/use-thread-navigation';
import { getFilePath } from '../lib/diff-utils';
import { CopyIcon } from './icons/copy-icon';
import { CheckIcon } from './icons/check-icon';
import { ChevronUpIcon } from './icons/chevron-up-icon';
import { ChevronDownIcon } from './icons/chevron-down-icon';
import { TrashIcon } from './icons/trash-icon';
import { ConfirmDialog } from './ui/confirm-dialog';
import { GENERAL_THREAD_FILE_PATH } from '../types/comment';
import type { ViewMode } from '../lib/diff-utils';
import type { CommentThread } from '../types/comment';
import { isThreadResolved } from '../types/comment';

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  hideWhitespace: boolean;
  onHideWhitespaceChange: (hide: boolean) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  diff?: ParsedDiff;
  diffRef?: string;
  threads: CommentThread[];
  onDeleteAllComments: () => void;
  onScrollToThread: (threadId: string, filePath: string) => void;
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

function formatThreadsForCopy(threads: CommentThread[], diff?: ParsedDiff, diffRef?: string): string {
  const unresolvedThreads = threads.filter(t => !isThreadResolved(t));
  if (unresolvedThreads.length === 0) {
    return '';
  }

  const parts: string[] = [];

  if (diffRef) {
    parts.push(`Diff ref: ${diffRef}`);
    parts.push('');
  }

  for (const thread of unresolvedThreads) {
    if (thread.filePath === GENERAL_THREAD_FILE_PATH) {
      parts.push('## General comment');
    } else {
      const lineRange = thread.startLine === thread.endLine
        ? `${thread.startLine}`
        : `${thread.startLine}-${thread.endLine}`;
      const sideDesc = thread.side === 'old' ? 'before change' : 'after change';
      parts.push(`## ${thread.filePath}:${lineRange} (${sideDesc})`);
    }

    const codeLines = extractCodeContext(diff, thread.filePath, thread.side, thread.startLine, thread.endLine);
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
    diffRef,
    threads,
    onDeleteAllComments,
    onScrollToThread,
  } = props;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { copied, copy } = useCopy();
  const { currentIndex, count: unresolvedCount, goToPrevious, goToNext } = useThreadNavigation(threads, onScrollToThread);

  const baseBtn = 'px-3 py-1 border border-border text-sm text-text-secondary transition-colors duration-150 cursor-pointer';
  const activeBtn = 'bg-accent text-white border-accent';
  const inactiveBtn = 'bg-bg hover:bg-hover hover:text-text';

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
      {unresolvedCount > 0 && (
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <span className="text-xs text-text-muted px-2.5 py-1">
              {currentIndex >= 0 ? `${currentIndex + 1}/${unresolvedCount}` : unresolvedCount} comment{unresolvedCount !== 1 ? 's' : ''}
            </span>
            <button
              onClick={goToPrevious}
              className="px-1.5 py-1 border-l border-border text-text-secondary hover:bg-hover hover:text-text transition-colors cursor-pointer"
              title="Previous comment"
            >
              <ChevronUpIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={goToNext}
              className="px-1.5 py-1 border-l border-border text-text-secondary hover:bg-hover hover:text-text transition-colors cursor-pointer"
              title="Next comment"
            >
              <ChevronDownIcon className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => copy(formatThreadsForCopy(threads, diff, diffRef))}
              className={cn(baseBtn, 'rounded-l-md flex items-center gap-1.5', inactiveBtn)}
              title="Copy unresolved comments to clipboard"
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
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className={cn(baseBtn, 'rounded-r-md border-l-0 flex items-center self-stretch', inactiveBtn)}
              title="Delete all comments"
            >
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete all comments"
          message="Are you sure you want to delete all comments? This action cannot be undone."
          confirmLabel="Delete all"
          onConfirm={() => {
            onDeleteAllComments();
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
