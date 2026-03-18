import { useState, useRef, useEffect } from 'react';
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
import { UnifiedViewIcon } from './icons/unified-view-icon';
import { SplitViewIcon } from './icons/split-view-icon';
import { SunIcon } from './icons/sun-icon';
import { MoonIcon } from './icons/moon-icon';
import { EyeIcon } from './icons/eye-icon';
import { EyeOffIcon } from './icons/eye-off-icon';
import { KeyboardIcon } from './icons/keyboard-icon';
import { EllipsisIcon } from './icons/ellipsis-icon';
import { GitBranchIcon } from './icons/git-branch-icon';
import { DiffStats } from './diff-stats';
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
  onShowHelp: () => void;
  diff?: ParsedDiff;
  diffRef?: string;
  threads: CommentThread[];
  onDeleteAllComments: () => void;
  onScrollToThread: (threadId: string, filePath: string) => void;
  repoName: string | null;
  branch: string | null;
  description: string | null;
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
    onShowHelp,
    diff,
    diffRef,
    threads,
    onDeleteAllComments,
    onScrollToThread,
    repoName,
    branch,
    description,
  } = props;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { copied, copy } = useCopy();
  const { currentIndex, count: unresolvedCount, goToPrevious, goToNext } = useThreadNavigation(threads, onScrollToThread);

  useEffect(() => {
    if (!showMenu) {
      return;
    }
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMenu]);

  const baseBtn = 'px-2.5 py-1 text-xs text-text-secondary transition-colors duration-150 cursor-pointer';
  const activeBtn = 'bg-accent text-white';
  const inactiveBtn = 'bg-bg-tertiary hover:bg-hover hover:text-text';

  const menuItemClass = 'flex items-center gap-2.5 w-full px-3 py-1.5 text-xs text-text-secondary hover:bg-hover hover:text-text transition-colors cursor-pointer text-left';

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-bg-secondary border-b border-border font-sans text-xs">
      <div className="flex items-center gap-2.5 min-w-0 shrink">
        {repoName && <span className="font-semibold text-text text-sm truncate">{repoName}</span>}
        {branch && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-diff-hunk-bg text-diff-hunk-text rounded font-mono text-[11px] shrink-0">
            <GitBranchIcon className="w-3 h-3" />
            {branch}
          </span>
        )}
        {description && <span className="text-text-muted truncate hidden lg:inline">{description}</span>}
        {diff && (
          <span className="inline-flex items-center bg-bg-tertiary rounded-md overflow-hidden text-text-muted shrink-0">
            <span className="px-2 py-0.5">{diff.stats.filesChanged} file{diff.stats.filesChanged !== 1 ? 's' : ''} changed</span>
            <span className="px-2 py-0.5">
              <DiffStats additions={diff.stats.totalAdditions} deletions={diff.stats.totalDeletions} />
            </span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <div className="flex items-center rounded-md overflow-hidden">
          <button
            className={cn(baseBtn, 'flex items-center gap-1.5', viewMode === 'unified' ? activeBtn : inactiveBtn)}
            onClick={() => onViewModeChange('unified')}
            title="Unified view (u)"
          >
            <UnifiedViewIcon className="w-3.5 h-3.5" />
            Unified
          </button>
          <button
            className={cn(baseBtn, 'flex items-center gap-1.5', viewMode === 'split' ? activeBtn : inactiveBtn)}
            onClick={() => onViewModeChange('split')}
            title="Split view (s)"
          >
            <SplitViewIcon className="w-3.5 h-3.5" />
            Split
          </button>
        </div>
        {unresolvedCount > 0 && (
          <>
            <div className="flex items-stretch bg-bg-tertiary rounded-md overflow-hidden">
              <span className="flex items-center text-xs text-text-muted px-2 py-1">
                {currentIndex >= 0
                  ? `${currentIndex + 1} of ${unresolvedCount} ${unresolvedCount === 1 ? 'comment' : 'comments'}`
                  : `${unresolvedCount} ${unresolvedCount === 1 ? 'comment' : 'comments'}`}
              </span>
              <button
                onClick={goToPrevious}
                className="flex items-center px-1.5 text-text-muted hover:bg-hover hover:text-text transition-colors cursor-pointer"
                title="Previous comment"
              >
                <ChevronUpIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={goToNext}
                className="flex items-center px-1.5 text-text-muted hover:bg-hover hover:text-text transition-colors cursor-pointer"
                title="Next comment"
              >
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-stretch bg-bg-tertiary rounded-md overflow-hidden">
              <button
                onClick={() => copy(formatThreadsForCopy(threads, diff, diffRef))}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-secondary hover:bg-hover hover:text-text transition-colors cursor-pointer"
                title="Copy unresolved comments to clipboard"
              >
                {copied ? (
                  <>
                    <CheckIcon className="w-3 h-3 text-added" />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3 h-3" />
                    Copy comments
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center px-2 text-text-muted hover:bg-hover hover:text-red-500 transition-colors cursor-pointer"
                title="Delete all comments"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
        <div className="relative" ref={menuRef}>
          <button
            className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-hover transition-colors cursor-pointer"
            onClick={() => setShowMenu(!showMenu)}
            title="More options"
          >
            <EllipsisIcon className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-bg-secondary rounded-md shadow-lg ring-1 ring-border z-50">
              <button
                className={menuItemClass}
                onClick={() => {
                  onHideWhitespaceChange(!hideWhitespace);
                  setShowMenu(false);
                }}
              >
                {hideWhitespace ? <EyeOffIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                {hideWhitespace ? 'Show whitespace' : 'Hide whitespace'}
                {hideWhitespace && <span className="ml-auto text-accent text-[10px]">On</span>}
              </button>
              <button
                className={menuItemClass}
                onClick={() => {
                  onToggleTheme();
                  setShowMenu(false);
                }}
              >
                {theme === 'light' ? <MoonIcon className="w-3.5 h-3.5" /> : <SunIcon className="w-3.5 h-3.5" />}
                {theme === 'light' ? 'Dark mode' : 'Light mode'}
              </button>
              <button
                className={menuItemClass}
                onClick={() => {
                  onShowHelp();
                  setShowMenu(false);
                }}
              >
                <KeyboardIcon className="w-3.5 h-3.5" />
                Keyboard shortcuts
                <span className="ml-auto text-text-muted">?</span>
              </button>
            </div>
          )}
        </div>
      </div>
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
