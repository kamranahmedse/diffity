import type { DiffHunk } from '@diffity/parser';
import { DiffLine } from '../diff-line/diff-line.js';
import styles from './hunk-block.module.css';

interface HunkBlockProps {
  hunk: DiffHunk;
}

export function HunkBlock(props: HunkBlockProps) {
  const { hunk } = props;

  const headerText = hunk.context
    ? `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@ ${hunk.context}`
    : `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`;

  return (
    <tbody className={styles.hunk}>
      <tr className={styles.header}>
        <td colSpan={4} className={styles.headerCell}>
          {headerText}
        </td>
      </tr>
      {hunk.lines.map((line, i) => (
        <DiffLine key={i} line={line} />
      ))}
    </tbody>
  );
}
