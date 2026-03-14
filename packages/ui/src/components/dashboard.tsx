import { useOverview } from '../hooks/use-overview.js';
import { useCommits } from '../hooks/use-commits.js';
import { useInfo } from '../hooks/use-info.js';
import { OverviewFileList } from './overview-file-list.js';
import { CommitList } from './commit-list.js';
import { CheckCircleIcon } from './icons/check-circle-icon.js';
import { PageLoader } from './skeleton.js';

interface DashboardProps {
  onNavigate: (ref: string) => void;
}

export function Dashboard(props: DashboardProps) {
  const { onNavigate } = props;
  const { data: overview, loading: overviewLoading, error } = useOverview();
  const { data: commitsPage, loading: commitsLoading } = useCommits();
  const { data: info, loading: infoLoading } = useInfo();

  const anyLoading = overviewLoading || commitsLoading || infoLoading;

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-bg text-text font-sans">
        <div className="flex flex-col items-center justify-center p-12 text-deleted text-center">
          <h2 className="text-xl mb-2">Failed to load overview</h2>
          <p className="text-text-secondary">{error}</p>
        </div>
      </div>
    );
  }

  if (anyLoading || !overview) {
    return <PageLoader />;
  }

  const isClean = overview.files.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-bg text-text font-sans">
      <div className="border-b border-border bg-bg-secondary px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {info?.name && (
            <span className="font-semibold text-lg text-accent">{info.name}</span>
          )}
          {info?.branch && (
            <span className="px-2 py-0.5 bg-diff-hunk-bg text-diff-hunk-text rounded-md font-mono text-xs">
              {info.branch}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {isClean ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted text-center gap-3">
              <div className="text-added opacity-50 mb-2">
                <CheckCircleIcon />
              </div>
              <h2 className="text-xl text-text-secondary">Working tree is clean</h2>
              <p>No changes to display.</p>
            </div>
          ) : (
            <OverviewFileList
              files={overview.files}
              onViewAll={() => onNavigate('all')}
            />
          )}

          <div className="border border-border rounded-lg bg-bg-secondary overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-medium text-text">Recent commits</h3>
            </div>
            <CommitList
              initialCommits={commitsPage?.commits ?? []}
              initialHasMore={commitsPage?.hasMore ?? false}
              onCommitClick={(hash) => onNavigate(hash)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
