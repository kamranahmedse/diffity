import type { DiffHunk } from '@diffity/parser';

export interface ExpandControls {
  position: 'top' | 'between' | 'bottom';
  remainingLines: number;
  remainingUp: number;
  remainingDown: number;
  loading: boolean;
  wasExpanded: boolean;
  onExpand: (direction: 'up' | 'down' | 'all') => void;
}

interface HunkHeaderProps {
  hunk: DiffHunk;
  expandControls?: ExpandControls;
}

export function formatHunkHeader(hunk: DiffHunk): string {
  const range = `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`;
  if (hunk.context) {
    return `${range} ${hunk.context}`;
  }
  return range;
}

const SMALL_GAP_THRESHOLD = 40;

const gutterCell = 'w-[25px] min-w-[25px] bg-diff-hunk-bg border-r border-border-muted p-0';
const expandBtn = 'flex items-center justify-center w-full h-[18px] cursor-pointer text-diff-hunk-text/70 hover:text-diff-hunk-text transition-colors';
const expandRow = 'bg-diff-hunk-bg';

function Spinner() {
  return (
    <td className={gutterCell}>
      <div className="flex items-center justify-center h-[18px]">
        <span className="inline-block w-3 h-3 border-2 border-text-muted/40 border-t-transparent rounded-full animate-spin" />
      </div>
    </td>
  );
}

function ExpandDownIcon() {
  return (
    <svg className="w-[14px] h-[14px]" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 2.75a.75.75 0 01.75-.75h1a.75.75 0 010 1.5h-1A.75.75 0 012 2.75zm4 0a.75.75 0 01.75-.75h1a.75.75 0 010 1.5h-1A.75.75 0 016 2.75zm4 0a.75.75 0 01.75-.75h1a.75.75 0 010 1.5h-1a.75.75 0 01-.75-.75zM7.47 5.97a.75.75 0 011.06 0l3.25 3.25a.75.75 0 11-1.06 1.06L8.5 8.06V14.25a.75.75 0 01-1.5 0V8.06L4.78 10.28a.75.75 0 01-1.06-1.06l3.25-3.25z" />
    </svg>
  );
}

function ExpandUpIcon() {
  return (
    <svg className="w-[14px] h-[14px]" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 13.25a.75.75 0 00.75.75h1a.75.75 0 000-1.5h-1a.75.75 0 00-.75.75zm4 0a.75.75 0 00.75.75h1a.75.75 0 000-1.5h-1a.75.75 0 00-.75.75zm4 0a.75.75 0 00.75.75h1a.75.75 0 000-1.5h-1a.75.75 0 00-.75.75zM7.47 10.03a.75.75 0 001.06 0l3.25-3.25a.75.75 0 00-1.06-1.06L8.5 7.94V1.75a.75.75 0 00-1.5 0v6.19L4.78 5.72a.75.75 0 00-1.06 1.06l3.25 3.25z" />
    </svg>
  );
}

function ChevronUpDownIcon() {
  return (
    <svg className="w-[14px] h-[14px]" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8.177 2.073a.25.25 0 00-.354 0L4.427 5.47a.25.25 0 00.177.427h6.792a.25.25 0 00.177-.427L8.177 2.073zM7.823 13.927a.25.25 0 00.354 0l3.396-3.397a.25.25 0 00-.177-.427H4.604a.25.25 0 00-.177.427l3.396 3.397z" />
    </svg>
  );
}

export function HunkHeader(props: HunkHeaderProps) {
  const { hunk, expandControls } = props;

  if (!expandControls) {
    return (
      <tr className="bg-diff-hunk-bg">
        <td colSpan={4} className="px-3 py-1 font-mono text-xs text-diff-hunk-text select-none">
          {formatHunkHeader(hunk)}
        </td>
      </tr>
    );
  }

  const { position, remainingLines, remainingUp, remainingDown, loading, wasExpanded, onExpand } = expandControls;

  if (remainingLines <= 0) {
    if (wasExpanded) {
      return null;
    }
    return (
      <tr className="bg-diff-hunk-bg">
        <td colSpan={4} className="px-3 py-1 font-mono text-xs text-diff-hunk-text select-none">
          {formatHunkHeader(hunk)}
        </td>
      </tr>
    );
  }

  const isSmallGap = remainingLines <= SMALL_GAP_THRESHOLD;
  const showUp = remainingUp > 0;
  const showDown = remainingDown > 0;

  if (position === 'top') {
    return (
      <>
        <tr className={expandRow}>
          {loading ? <Spinner /> : (
            <td className={gutterCell}>
              <button className={expandBtn} onClick={() => onExpand('up')} title={`Expand ${Math.min(remainingLines, 20)} lines`}>
                <ExpandUpIcon />
              </button>
            </td>
          )}
          <td colSpan={3} />
        </tr>
        <tr className="bg-diff-hunk-bg">
          <td colSpan={4} className="px-3 py-1 font-mono text-xs text-diff-hunk-text select-none">
            {formatHunkHeader(hunk)}
          </td>
        </tr>
      </>
    );
  }

  if (isSmallGap || (!showUp && showDown) || (showUp && !showDown)) {
    return (
      <tr className="bg-diff-hunk-bg">
        {loading ? <Spinner /> : (
          <td className={gutterCell}>
            <button
              className={expandBtn}
              onClick={() => onExpand(isSmallGap ? 'all' : showUp ? 'up' : 'down')}
              title={isSmallGap ? `Expand all ${remainingLines} lines` : `Expand ${Math.min(remainingLines, 20)} lines`}
            >
              {isSmallGap ? <ChevronUpDownIcon /> : showUp ? <ExpandUpIcon /> : <ExpandDownIcon />}
            </button>
          </td>
        )}
        <td colSpan={3} className="px-3 py-1 font-mono text-xs text-diff-hunk-text select-none">
          {formatHunkHeader(hunk)}
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className={expandRow}>
        {loading ? <Spinner /> : (
          <td className={gutterCell}>
            <button className={expandBtn} onClick={() => onExpand('down')} title="Expand up">
              <ExpandUpIcon />
            </button>
          </td>
        )}
        <td colSpan={3} />
      </tr>
      <tr className="bg-diff-hunk-bg">
        <td className={gutterCell} />
        <td colSpan={3} className="px-3 py-1 font-mono text-xs text-diff-hunk-text select-none">
          {formatHunkHeader(hunk)}
        </td>
      </tr>
      <tr className={expandRow}>
        <td className={gutterCell}>
          <button className={expandBtn} onClick={() => onExpand('up')} title="Expand down">
            <ExpandDownIcon />
          </button>
        </td>
        <td colSpan={3} />
      </tr>
    </>
  );
}

export function ExpandRow(props: { position: 'top' | 'bottom'; remainingLines: number; loading: boolean; onExpand: (dir: 'up' | 'down' | 'all') => void }) {
  const { position, remainingLines, loading, onExpand } = props;

  if (remainingLines <= 0) {
    return null;
  }

  return (
    <tr className={expandRow}>
      {loading ? <Spinner /> : (
        <td className={gutterCell}>
          <button
            className={expandBtn}
            onClick={() => onExpand('down')}
            title={`Expand ${Math.min(remainingLines, 20)} lines`}
          >
            {position === 'bottom' ? <ExpandUpIcon /> : <ExpandDownIcon />}
          </button>
        </td>
      )}
      <td colSpan={3} />
    </tr>
  );
}
