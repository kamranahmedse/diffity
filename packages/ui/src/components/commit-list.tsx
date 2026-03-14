import { useState, useCallback } from 'react';
import { type Commit, fetchCommits } from '../lib/api.js';

interface CommitListProps {
  initialCommits: Commit[];
  initialHasMore: boolean;
  onCommitClick: (hash: string) => void;
}

export function CommitList(props: CommitListProps) {
  const { initialCommits, initialHasMore, onCommitClick } = props;
  const [commits, setCommits] = useState(initialCommits);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    setLoading(true);
    try {
      const page = await fetchCommits(commits.length);
      setCommits((prev) => [...prev, ...page.commits]);
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
    }
  }, [commits.length]);

  if (commits.length === 0) {
    return (
      <p className="text-sm text-text-muted px-4 py-3">No recent commits</p>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-border">
        {commits.map((commit) => (
          <li key={commit.hash}>
            <button
              onClick={() => onCommitClick(commit.hash)}
              className="w-full text-left px-4 py-3 hover:bg-bg-tertiary transition-colors flex items-center gap-3"
            >
              <code className="text-xs font-mono text-accent shrink-0">
                {commit.shortHash}
              </code>
              <span className="text-sm text-text truncate flex-1">
                {commit.message}
              </span>
              <span className="text-xs text-text-muted shrink-0">
                {commit.relativeDate}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={loadMore}
            disabled={loading}
            className="text-sm text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
