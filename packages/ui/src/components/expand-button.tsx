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
    <tr className="bg-diff-hunk-bg">
      <td colSpan={4} className="p-0 text-center">
        <button
          className="inline-flex items-center justify-center gap-1 w-full py-1 px-3 text-xs text-diff-hunk-text cursor-pointer transition-colors duration-100 hover:not-disabled:bg-accent/25 disabled:opacity-50 disabled:cursor-default"
          onClick={onClick}
          disabled={loading}
        >
          {loading ? (
            <span className="inline-block w-3 h-3 border-2 border-diff-hunk-text border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-[8px]">
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
