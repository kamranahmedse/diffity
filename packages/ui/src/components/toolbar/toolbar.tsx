import styles from './toolbar.module.css';

type ViewMode = 'unified' | 'split';

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  hideWhitespace: boolean;
  onHideWhitespaceChange: (hide: boolean) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Toolbar(props: ToolbarProps) {
  const {
    viewMode,
    onViewModeChange,
    hideWhitespace,
    onHideWhitespaceChange,
    theme,
    onToggleTheme,
  } = props;

  return (
    <div className={styles.toolbar}>
      <div className={styles.group}>
        <button
          className={`${styles.btn} ${viewMode === 'unified' ? styles.active : ''}`}
          onClick={() => onViewModeChange('unified')}
          title="Unified view (u)"
        >
          Unified
        </button>
        <button
          className={`${styles.btn} ${viewMode === 'split' ? styles.active : ''}`}
          onClick={() => onViewModeChange('split')}
          title="Split view (s)"
        >
          Split
        </button>
      </div>
      <div className={styles.group}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={hideWhitespace}
            onChange={e => onHideWhitespaceChange(e.target.checked)}
          />
          <span>Hide whitespace</span>
        </label>
      </div>
      <div className={styles.group}>
        <button
          className={styles.btn}
          onClick={onToggleTheme}
          title="Toggle theme"
        >
          {theme === 'light' ? 'Dark' : 'Light'}
        </button>
      </div>
    </div>
  );
}
