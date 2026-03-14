import { useState, useCallback, useRef, useEffect } from 'react';
import { useDiff } from '../hooks/use-diff.js';
import { useInfo } from '../hooks/use-info.js';
import { useTheme } from '../hooks/use-theme.js';
import { useKeyboard } from '../hooks/use-keyboard.js';
import { CommentsProvider } from '../context/comments-context.js';
import { SummaryBar } from './summary-bar.js';
import { Toolbar } from './toolbar.js';
import { DiffView, type DiffViewHandle } from './diff-view.js';
import { Sidebar } from './sidebar.js';
import { ShortcutModal } from './shortcut-modal.js';
import { CheckCircleIcon } from './icons/check-circle-icon.js';
import { PageLoader } from './skeleton.js';
import { type ViewMode, getFilePath, getAutoCollapsedPaths } from '../lib/diff-utils.js';
import { getFileBlocks, getHunkHeaders, scrollToElement } from '../lib/dom-utils.js';

interface DiffPageProps {
  refParam?: string;
  onGoHome?: () => void;
  isReview: boolean;
}

export function DiffPage(props: DiffPageProps) {
  const { refParam, onGoHome, isReview } = props;

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [hideWhitespace, setHideWhitespace] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { data: diff, loading: diffLoading, error } = useDiff(hideWhitespace, refParam);
  const { data: info, loading: infoLoading } = useInfo(refParam);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [reviewedFiles, setReviewedFiles] = useState<Set<string>>(new Set());
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const mainRef = useRef<HTMLElement | null>(null);
  const diffViewRef = useRef<DiffViewHandle>(null);
  const currentFileIdx = useRef(0);
  const initializedDiffRef = useRef<typeof diff>(null);

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

  const getFilePathAtIndex = useCallback(
    (idx: number): string | null => {
      if (!diff) {
        return null;
      }
      const clampedIdx = Math.max(0, Math.min(diff.files.length - 1, idx));
      return getFilePath(diff.files[clampedIdx]);
    },
    [diff],
  );

  const navigateFile = useCallback((direction: number) => {
    const blocks = getFileBlocks();
    if (blocks.length === 0) {
      return;
    }
    currentFileIdx.current = Math.max(
      0,
      Math.min(blocks.length - 1, currentFileIdx.current + direction),
    );
    scrollToElement(blocks[currentFileIdx.current]);
  }, []);

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
      const path = getFilePathAtIndex(currentFileIdx.current);
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
      const path = getFilePathAtIndex(currentFileIdx.current);
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

  const handleSidebarFileClick = useCallback((path: string) => {
    setActiveFile(path);
    diffViewRef.current?.scrollToFile(path);
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

  if ((diffLoading || infoLoading) && !diff) {
    return <PageLoader />;
  }

  if (diff && diff.files.length === 0 && !diffLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg text-text font-sans gap-3">
        <div className="text-added opacity-50 mb-2">
          <CheckCircleIcon />
        </div>
        <h2 className="text-xl text-text-secondary">No changes found</h2>
        <p className="text-text-muted">There are no differences to display.</p>
        <div className="mt-4 flex flex-col gap-2 items-center">
          <p className="text-sm text-text-muted mb-1">Try one of these:</p>
          <code className="inline-block px-3 py-1 bg-bg-secondary border border-border rounded-md font-mono text-sm text-text">
            diffity --staged
          </code>
          <code className="inline-block px-3 py-1 bg-bg-secondary border border-border rounded-md font-mono text-sm text-text">
            diffity HEAD~1
          </code>
          <code className="inline-block px-3 py-1 bg-bg-secondary border border-border rounded-md font-mono text-sm text-text">
            diffity main..feature
          </code>
        </div>
      </div>
    );
  }

  return (
    <CommentsProvider>
    <div className="flex flex-col h-screen bg-bg text-text font-sans">
      <SummaryBar
        diff={diff}
        repoName={info?.name || null}
        branch={info?.branch || null}
        description={info?.description || null}
        onGoHome={!isReview ? onGoHome : undefined}
      />
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hideWhitespace={hideWhitespace}
        onHideWhitespaceChange={setHideWhitespace}
        theme={theme}
        onToggleTheme={toggleTheme}
        diff={diff || undefined}
        diffRef={refParam}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          files={diff?.files || []}
          activeFile={activeFile}
          reviewedFiles={reviewedFiles}
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
            onActiveFileChange={setActiveFile}
            handle={diffViewRef}
            baseRef={refParam}
            scrollRef={(node) => {
              mainRef.current = node;
            }}
          />
        ) : null}
      </div>
      {showHelp && <ShortcutModal onClose={() => setShowHelp(false)} />}
    </div>
    </CommentsProvider>
  );
}
