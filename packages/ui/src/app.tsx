import { useState, useCallback, useRef } from 'react';
import { useDiff } from './hooks/use-diff.js';
import { useInfo } from './hooks/use-info.js';
import { useTheme } from './hooks/use-theme.js';
import { useKeyboard } from './hooks/use-keyboard.js';
import { SummaryBar } from './components/summary-bar.js';
import { Toolbar } from './components/toolbar.js';
import { DiffView } from './components/diff-view.js';
import { Sidebar } from './components/sidebar.js';
import { ShortcutModal } from './components/shortcut-modal.js';
import type { ViewMode } from './lib/diff-utils.js';

function getFileBlocks(): HTMLElement[] {
  return Array.from(document.querySelectorAll('[id^="file-"]'));
}

function getHunkHeaders(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll('tbody > tr:first-child')
  );
}

function scrollToElement(el: HTMLElement) {
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [hideWhitespace, setHideWhitespace] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { data: diff, loading, error } = useDiff(hideWhitespace);
  const { data: info } = useInfo();
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const currentFileIdx = useRef(0);

  const navigateFile = useCallback((direction: number) => {
    const blocks = getFileBlocks();
    if (blocks.length === 0) {
      return;
    }
    currentFileIdx.current = Math.max(
      0,
      Math.min(blocks.length - 1, currentFileIdx.current + direction)
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
      const blocks = getFileBlocks();
      if (blocks.length === 0) {
        return;
      }
      const idx = Math.max(0, Math.min(blocks.length - 1, currentFileIdx.current));
      blocks[idx].dispatchEvent(new CustomEvent('toggle-collapse'));
    },
    onCollapseAll: () => {
      const blocks = getFileBlocks();
      const anyExpanded = blocks.some(
        el => el.querySelector('table, .overflow-x-auto') !== null
      );
      document.dispatchEvent(
        new CustomEvent('collapse-all-files', { detail: { collapsed: anyExpanded } })
      );
    },
    onUnifiedView: () => setViewMode('unified'),
    onSplitView: () => setViewMode('split'),
    onShowHelp: () => setShowHelp(true),
    onFocusSearch: () => {
      const input = document.querySelector(
        'input[placeholder="Filter files..."]'
      ) as HTMLInputElement;
      if (input) {
        input.focus();
      }
    },
    onEscape: () => setShowHelp(false),
  });

  const handleSidebarFileClick = useCallback((path: string) => {
    setActiveFile(path);
    const el = document.getElementById(`file-${encodeURIComponent(path)}`);
    if (el) {
      scrollToElement(el);
    }
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

  return (
    <div className="flex flex-col min-h-screen bg-bg text-text font-sans">
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
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          files={diff?.files || []}
          activeFile={activeFile}
          onFileClick={handleSidebarFileClick}
        />
        <main ref={mainRef} className="flex-1 overflow-y-auto pb-12">
          {loading && (
            <div className="flex items-center justify-center p-12 text-text-muted text-lg">
              Loading diff...
            </div>
          )}
          {diff && (
            <DiffView
              diff={diff}
              viewMode={viewMode}
              theme={theme}
              onActiveFileChange={setActiveFile}
            />
          )}
          {diff && diff.files.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center p-12 text-text-muted text-center gap-3 min-h-[400px]">
              <div className="text-added opacity-50 mb-2">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              </div>
              <h2 className="text-xl text-text-secondary">No changes found</h2>
              <p>There are no differences to display.</p>
              <div className="mt-4 flex flex-col gap-2 items-center">
                <p className="text-sm mb-1">Try one of these:</p>
                <code className="inline-block px-3 py-1 bg-bg-secondary border border-border rounded-md font-mono text-sm text-text">diffity --staged</code>
                <code className="inline-block px-3 py-1 bg-bg-secondary border border-border rounded-md font-mono text-sm text-text">diffity HEAD~1</code>
                <code className="inline-block px-3 py-1 bg-bg-secondary border border-border rounded-md font-mono text-sm text-text">diffity main..feature</code>
              </div>
            </div>
          )}
        </main>
      </div>
      {showHelp && <ShortcutModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
