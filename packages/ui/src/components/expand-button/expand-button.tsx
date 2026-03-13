import styles from './expand-button.module.css';

interface ExpandButtonProps {
  linesCount: number;
  direction: 'up' | 'down';
  loading?: boolean;
  onClick: () => void;
}

export function ExpandButton(props: ExpandButtonProps) {
  const { linesCount, direction, loading, onClick } = props;

  if (linesCount <= 0) {
    return null;
  }

  const label =
    linesCount <= 20
      ? `Show ${linesCount} hidden line${linesCount !== 1 ? 's' : ''}`
      : `Show 20 more lines ${direction === 'up' ? 'above' : 'below'}`;

  return (
    <tr className={styles.row}>
      <td colSpan={4} className={styles.cell}>
        <button className={styles.btn} onClick={onClick} disabled={loading}>
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            <>
              <span className={styles.icon}>
                {direction === 'up' ? '\u25b2' : '\u25bc'}
              </span>
              {label}
            </>
          )}
        </button>
      </td>
    </tr>
  );
}
