import type { ParsedDiff } from '@diffity/parser';
import styles from './summary-bar.module.css';

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
      <div className={styles.bar}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        {repoName && <span className={styles.repo}>{repoName}</span>}
        {branch && <span className={styles.branch}>{branch}</span>}
        {description && (
          <span className={styles.description}>{description}</span>
        )}
      </div>
      <div className={styles.stats}>
        <span className={styles.files}>
          {diff.stats.filesChanged} file{diff.stats.filesChanged !== 1 ? 's' : ''} changed
        </span>
        <span className={styles.additions}>+{diff.stats.totalAdditions}</span>
        <span className={styles.deletions}>-{diff.stats.totalDeletions}</span>
      </div>
    </div>
  );
}
