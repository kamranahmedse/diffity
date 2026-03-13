import type { ParsedDiff } from '@diffity/parser';
import { DiffStats } from './diff-stats.js';

interface SummaryBarProps {
  diff: ParsedDiff | null;
  repoName: string | null;
  branch: string | null;
  description: string | null;
}

export function SummaryBar(props: SummaryBarProps) {
  const { diff, repoName, branch, description } = props;

  if (!diff) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border font-sans text-sm min-h-11">
        <div className="w-full h-5 bg-bg-tertiary rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary border-b border-border font-sans text-sm min-h-11">
      <div className="flex items-center gap-2">
        {repoName && <span className="font-semibold text-accent">{repoName}</span>}
        {branch && (
          <span className="px-2 py-0.5 bg-diff-hunk-bg text-diff-hunk-text rounded-md font-mono text-xs">
            {branch}
          </span>
        )}
        {description && <span className="text-text-secondary">{description}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-text-secondary">
          {diff.stats.filesChanged} file{diff.stats.filesChanged !== 1 ? 's' : ''} changed
        </span>
        <DiffStats additions={diff.stats.totalAdditions} deletions={diff.stats.totalDeletions} />
      </div>
    </div>
  );
}
