import { cn } from '../lib/cn.js';
import type { ViewMode } from '../lib/diff-utils.js';

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
    </div>
  );
}
