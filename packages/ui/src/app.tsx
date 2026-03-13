import { useState } from 'react';
import { useDiff } from './hooks/use-diff.js';
import { useInfo } from './hooks/use-info.js';
import { useTheme } from './hooks/use-theme.js';
import { SummaryBar } from './components/summary-bar/summary-bar.js';
import { Toolbar } from './components/toolbar/toolbar.js';
import { DiffView } from './components/diff-view/diff-view.js';
import { Sidebar } from './components/sidebar/sidebar.js';
import styles from './app.module.css';

type ViewMode = 'unified' | 'split';

export function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [hideWhitespace, setHideWhitespace] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { data: diff, loading, error } = useDiff(hideWhitespace);
  const { data: info } = useInfo();
  const [activeFile, setActiveFile] = useState<string | null>(null);

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
          onFileClick={setActiveFile}
        />
        <main className={styles.main}>
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
    </div>
  );
}
