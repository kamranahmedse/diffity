import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDiff } from '../hooks/use-diff';
import { useInfo } from '../hooks/use-info';
import { useTheme } from '../hooks/use-theme';
import { useKeyboard } from '../hooks/use-keyboard';
import { useReviewThreads } from '../hooks/use-review-threads';
import { useCommentActions } from '../hooks/use-comment-actions';
import { SummaryBar } from './summary-bar';
import { Toolbar } from './toolbar';
import { DiffView, type DiffViewHandle } from './diff-view';
import { Sidebar } from './sidebar';
import { ShortcutModal } from './shortcut-modal';
import { StaleDiffBanner } from './stale-diff-banner';
import { CheckCircleIcon } from './icons/check-circle-icon';
import { PageLoader } from './skeleton';
import { useDiffStaleness } from '../hooks/use-diff-staleness';
import { type ViewMode, getFilePath, getAutoCollapsedPaths, isWorkingTreeRef } from '../lib/diff-utils';
import { getHunkHeaders, scrollToElement } from '../lib/dom-utils';
import type { LineSelection } from '../types/comment';
import { isThreadResolved } from '../types/comment';

interface DiffPageProps {
  refParam?: string;
  initialTheme?: 'light' | 'dark' | null;
  initialViewMode?: 'split' | 'unified' | null;
}

export function DiffPage(props: DiffPageProps) {
  const { refParam, initialTheme, initialViewMode } = props;

  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode || 'split');
  const [hideWhitespace, setHideWhitespace] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { theme, toggleTheme } = useTheme(initialTheme);
  const { data: diff, loading: diffLoading, error } = useDiff(hideWhitespace, refParam);
  const { data: info, loading: infoLoading } = useInfo(refParam);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [reviewedFiles, setReviewedFiles] = useState<Set<string>>(new Set());
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const [pendingSelection, setPendingSelection] = useState<LineSelection | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const diffViewRef = useRef<DiffViewHandle>(null);
  const currentFileIdx = useRef(0);
  const initializedDiffRef = useRef<typeof diff>(null);

  const reviewsEnabled = !!info?.capabilities?.reviews;
  const sessionId = info?.sessionId ?? null;
  const isWorkingTree = isWorkingTreeRef(refParam);
  const { isStale, resetStaleness } = useDiffStaleness(refParam, isWorkingTree);

  const { data: serverThreads, isFetched: threadsFetched } = useReviewThreads(reviewsEnabled ? sessionId : null);
  const threads = reviewsEnabled && serverThreads ? serverThreads : [];
  const commentActions = useCommentActions(sessionId, reviewsEnabled);

  const filesWithComments = useMemo(() => {
    const paths = new Set<string>();
    for (const thread of threads) {
      if (!isThreadResolved(thread)) {
        paths.add(thread.filePath);
      }
    }
    return paths;
  }, [threads]);

  const handleAddThread = useCallback((...args: Parameters<typeof commentActions.addThread>) => {
    commentActions.addThread(...args);
    setPendingSelection(null);
  }, [commentActions]);

  useEffect(() => {
    if (!diff || diff === initializedDiffRef.current) {
      return;
    }
    initializedDiffRef.current = diff;

    const autoCollapsed = getAutoCollapsedPaths(diff.files);
    if (autoCollapsed.size > 0) {
      setCollapsedFiles(autoCollapsed);
    }
  }, [diff]);

  const handleToggleCollapse = useCallback((path: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleReviewedChange = useCallback((path: string, reviewed: boolean) => {
    setReviewedFiles((prev) => {
      const next = new Set(prev);
      if (reviewed) {
        next.add(path);
      } else {
        next.delete(path);
      }
      return next;
    });
    if (reviewed) {
      setCollapsedFiles((prev) => {
        const next = new Set(prev);
        next.add(path);
        return next;
      });
    } else {
      setCollapsedFiles((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  }, []);

  const getCurrentFilePath = useCallback((): string | null => {
    if (!diff) {
      return null;
    }
    return getFilePath(diff.files[currentFileIdx.current]);
  }, [diff]);

  const navigateFile = useCallback((direction: number) => {
    if (!diff) {
      return;
    }
    const nextIdx = Math.max(0, Math.min(diff.files.length - 1, currentFileIdx.current + direction));
    currentFileIdx.current = nextIdx;
    const path = getFilePath(diff.files[nextIdx]);
    diffViewRef.current?.scrollToFile(path);
  }, [diff]);

  const navigateHunk = useCallback((direction: number) => {
    const hunks = getHunkHeaders();
    if (hunks.length === 0) {
      return;
    }
    let target = direction > 0 ? hunks[0] : hunks[hunks.length - 1];

    for (let i = 0; i < hunks.length; i++) {
      const rect = hunks[i].getBoundingClientRect();
      if (direction > 0 && rect.top > 100) {
        target = hunks[i];
        break;
      }
      if (direction < 0 && rect.top < -10) {
        target = hunks[i];
      }
    }

    scrollToElement(target);
  }, []);

  useKeyboard({
    onNextFile: () => navigateFile(1),
    onPrevFile: () => navigateFile(-1),
    onNextHunk: () => navigateHunk(1),
    onPrevHunk: () => navigateHunk(-1),
    onToggleCollapse: () => {
      const path = getCurrentFilePath();
      if (path) {
        handleToggleCollapse(path);
      }
    },
    onCollapseAll: () => {
      if (!diff) {
        return;
      }
      const allPaths = diff.files.map((f) => getFilePath(f));
      const anyExpanded = allPaths.some((p) => !collapsedFiles.has(p));
      if (anyExpanded) {
        setCollapsedFiles(new Set(allPaths));
      } else {
        setCollapsedFiles(new Set());
      }
    },
    onToggleReviewed: () => {
      const path = getCurrentFilePath();
      if (!path) {
        return;
      }
      const wasReviewed = reviewedFiles.has(path);
      handleReviewedChange(path, !wasReviewed);
      if (!wasReviewed) {
        navigateFile(1);
      }
    },
    onUnifiedView: () => setViewMode('unified'),
    onSplitView: () => setViewMode('split'),
    onShowHelp: () => setShowHelp(true),
    onFocusSearch: () => {
      const input = document.querySelector(
        'input[placeholder="Filter files..."]',
      ) as HTMLInputElement;
      if (input) {
        input.focus();
      }
    },
    onEscape: () => setShowHelp(false),
  });

  const queryClient = useQueryClient();
  const canRevert = useMemo(() => isWorkingTreeRef(refParam), [refParam]);

  const handleRevert = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['diff'] });
  }, [queryClient]);

  const handleRefreshDiff = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['diff'] });
    resetStaleness();
  }, [queryClient, resetStaleness]);

  const handleSidebarFileClick = useCallback((path: string) => {
    setActiveFile(path);
    diffViewRef.current?.scrollToFile(path);
  }, []);

  const handleScrollToThread = useCallback((threadId: string, filePath: string) => {
    diffViewRef.current?.scrollToThread(threadId, filePath);
  }, []);

  const handleActiveFileFromScroll = useCallback((path: string) => {
    setActiveFile(path);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-bg text-text font-sans">
        <div className="flex flex-col items-center justify-center p-12 text-deleted text-center">
          <h2 className="text-xl mb-2">Failed to load diff</h2>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  const threadsLoading = reviewsEnabled && !threadsFetched;
  if ((diffLoading || infoLoading || threadsLoading) && !diff) {
    return <PageLoader />;
  }

  if (!info || threadsLoading) {
    return <PageLoader />;
  }

  if (diff && diff.files.length === 0 && !diffLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg text-text font-sans gap-2">
        <div className="text-added opacity-40 mb-1">
          <CheckCircleIcon />
        </div>
        <h2 className="text-base font-medium text-text-secondary">No changes found</h2>
        <p className="text-xs text-text-muted">There are no differences to display.</p>
        <div className="mt-4 flex flex-col gap-1.5 items-center">
          <p className="text-xs text-text-muted mb-1">Try one of these</p>
          <code className="inline-block px-3 py-1 bg-bg-secondary border border-border rounded-md font-mono text-xs text-text">
            diffity HEAD~1
          </code>
          <code className="inline-block px-3 py-1 bg-bg-secondary border border-border rounded-md font-mono text-xs text-text">
            diffity main..feature
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg text-text font-sans">
      <SummaryBar
        diff={diff}
        repoName={info?.name || null}
        branch={info?.branch || null}
        description={info?.description || null}
      />
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hideWhitespace={hideWhitespace}
        onHideWhitespaceChange={setHideWhitespace}
        theme={theme}
        onToggleTheme={toggleTheme}
        onShowHelp={() => setShowHelp(true)}
        diff={diff || undefined}
        diffRef={refParam}
        threads={threads}
        onDeleteAllComments={commentActions.deleteAllThreads}
        onScrollToThread={handleScrollToThread}
      />
      {isStale && <StaleDiffBanner onRefresh={handleRefreshDiff} />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          files={diff?.files || []}
          activeFile={activeFile}
          reviewedFiles={reviewedFiles}
          filesWithComments={filesWithComments}
          onFileClick={handleSidebarFileClick}
        />
        {diff ? (
          <DiffView
            diff={diff}
            viewMode={viewMode}
            theme={theme}
            collapsedFiles={collapsedFiles}
            onToggleCollapse={handleToggleCollapse}
            reviewedFiles={reviewedFiles}
            onReviewedChange={handleReviewedChange}
            onActiveFileChange={handleActiveFileFromScroll}
            handle={diffViewRef}
            baseRef={refParam}
            canRevert={canRevert}
            onRevert={handleRevert}
            scrollRef={(node) => {
              mainRef.current = node;
            }}
            threads={threads}
            commentsEnabled={reviewsEnabled}
            commentActions={commentActions}
            onAddThread={handleAddThread}
            pendingSelection={pendingSelection}
            onPendingSelectionChange={setPendingSelection}
          />
        ) : null}
      </div>
      {showHelp && <ShortcutModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
