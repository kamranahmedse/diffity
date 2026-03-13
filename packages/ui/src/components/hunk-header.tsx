import type { DiffHunk } from '@diffity/parser';

interface HunkHeaderProps {
  hunk: DiffHunk;
}

export function formatHunkHeader(hunk: DiffHunk): string {
  const range = `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`;
  if (hunk.context) {
    return `${range} ${hunk.context}`;
  }
  return range;
}

export function HunkHeader(props: HunkHeaderProps) {
  const { hunk } = props;

  return (
    <tr className="bg-diff-hunk-bg">
      <td colSpan={4} className="px-3 py-1 font-mono text-xs text-diff-hunk-text select-none">
        {formatHunkHeader(hunk)}
      </td>
    </tr>
  );
}
