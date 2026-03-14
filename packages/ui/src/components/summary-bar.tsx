import type { ParsedDiff } from '@diffity/parser';
import { DiffStats } from './diff-stats.js';

interface SummaryBarProps {
  diff: ParsedDiff | null;
  repoName: string | null;
  branch: string | null;
  description: string | null;
  onGoHome?: () => void;
}

export function SummaryBar(props: SummaryBarProps) {
  const { diff, repoName, branch, description, onGoHome } = props;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border font-sans text-sm min-h-11">
      <div className="flex items-center gap-2">
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text"
            title="Back to dashboard"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 12L6 8l4-4" />
            </svg>
          </button>
        )}
        {repoName && <span className="font-semibold text-accent">{repoName}</span>}
        {branch && (
          <span className="px-2 py-0.5 bg-diff-hunk-bg text-diff-hunk-text rounded-md font-mono text-xs">
            {branch}
          </span>
        )}
        {description && <span className="text-text-secondary">{description}</span>}
      </div>
      {diff ? (
        <div className="flex items-center gap-3">
          <span className="text-text-secondary">
            {diff.stats.filesChanged} file{diff.stats.filesChanged !== 1 ? 's' : ''} changed
          </span>
          <DiffStats additions={diff.stats.totalAdditions} deletions={diff.stats.totalDeletions} />
        </div>
      ) : (
        <div className="w-48 h-5 bg-bg-tertiary rounded animate-pulse" />
      )}
    </div>
  );
}
