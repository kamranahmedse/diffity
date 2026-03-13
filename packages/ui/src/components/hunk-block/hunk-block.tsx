import type { DiffHunk } from '@diffity/parser';
import { DiffLine, type SyntaxToken } from '../diff-line/diff-line.js';
import styles from './hunk-block.module.css';

interface HunkBlockProps {
  hunk: DiffHunk;
  syntaxMap?: Map<string, SyntaxToken[]>;
}

function lineKey(lineNum: number | null, type: string): string {
  return `${type}-${lineNum}`;
}

export function HunkBlock(props: HunkBlockProps) {
  const { hunk, syntaxMap } = props;

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
      {hunk.lines.map((line, i) => {
        const num = line.type === 'delete' ? line.oldLineNumber : line.newLineNumber;
        const key = num !== null ? lineKey(num, line.type) : `line-${i}`;
        const tokens = syntaxMap?.get(key);
        return <DiffLine key={key} line={line} syntaxTokens={tokens} />;
      })}
    </tbody>
  );
}
