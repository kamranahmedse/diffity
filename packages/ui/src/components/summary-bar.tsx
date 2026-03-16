import type { ParsedDiff } from '@diffity/parser';
import { DiffStats } from './diff-stats';
import { GitBranchIcon } from './icons/git-branch-icon';

interface SummaryBarProps {
  diff: ParsedDiff | null;
  repoName: string | null;
  branch: string | null;
  description: string | null;
}

export function SummaryBar(props: SummaryBarProps) {
  const { diff, repoName, branch, description } = props;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-bg-secondary border-b border-border font-sans text-sm">
      <div className="flex items-center gap-2.5">
        {repoName && <span className="font-semibold text-text">{repoName}</span>}
        {branch && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-diff-hunk-bg text-diff-hunk-text rounded-md font-mono text-xs">
            <GitBranchIcon className="w-3 h-3" />
            {branch}
          </span>
        )}
        {description && <span className="text-text-secondary">{description}</span>}
      </div>
      {diff ? (
        <div className="flex items-center gap-3">
          <span className="text-text-muted text-xs">
            {diff.stats.filesChanged} file{diff.stats.filesChanged !== 1 ? 's' : ''}
          </span>
          <DiffStats additions={diff.stats.totalAdditions} deletions={diff.stats.totalDeletions} />
        </div>
      ) : (
        <div className="w-48 h-4 bg-bg-tertiary rounded animate-pulse" />
      )}
    </div>
  );
}
