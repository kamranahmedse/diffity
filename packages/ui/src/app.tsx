import { useState, useCallback, useRef } from 'react';
import { useDiff } from './hooks/use-diff.js';
import { useInfo } from './hooks/use-info.js';
import { useTheme } from './hooks/use-theme.js';
import { useKeyboard } from './hooks/use-keyboard.js';
import { SummaryBar } from './components/summary-bar/summary-bar.js';
import { Toolbar } from './components/toolbar/toolbar.js';
import { DiffView } from './components/diff-view/diff-view.js';
import { Sidebar } from './components/sidebar/sidebar.js';
import { ShortcutModal } from './components/shortcut-modal/shortcut-modal.js';
import styles from './app.module.css';

type ViewMode = 'unified' | 'split';

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
    const scrollTop = mainRef.current?.scrollTop || window.scrollY;
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
    onToggleCollapse: () => {},
    onCollapseAll: () => {},
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
      <div className={styles.layout}>
        <div className={styles.error}>
          <h2>Failed to load diff</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
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
      <div className={styles.content}>
        <Sidebar
          files={diff?.files || []}
          activeFile={activeFile}
          onFileClick={handleSidebarFileClick}
        />
        <main ref={mainRef} className={styles.main}>
          {loading && <div className={styles.loading}>Loading diff...</div>}
          {diff && (
            <DiffView
              diff={diff}
              viewMode={viewMode}
              onActiveFileChange={setActiveFile}
            />
          )}
          {diff && diff.files.length === 0 && (
            <div className={styles.empty}>
              <h2>No changes</h2>
              <p>No differences found.</p>
            </div>
          )}
        </main>
      </div>
      {showHelp && <ShortcutModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
