import type { DiffHunk, DiffLine as DiffLineType } from '@diffity/parser';
import styles from './hunk-block-split.module.css';

interface HunkBlockSplitProps {
  hunk: DiffHunk;
}

interface SplitRow {
  left: DiffLineType | null;
  right: DiffLineType | null;
}

function buildSplitRows(lines: DiffLineType[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.type === 'context') {
      rows.push({ left: line, right: line });
      i++;
      continue;
    }

    if (line.type === 'delete') {
      const deleteLines: DiffLineType[] = [];
      while (i < lines.length && lines[i].type === 'delete') {
        deleteLines.push(lines[i]);
        i++;
      }

      const addLines: DiffLineType[] = [];
      while (i < lines.length && lines[i].type === 'add') {
        addLines.push(lines[i]);
        i++;
      }

      const maxLen = Math.max(deleteLines.length, addLines.length);
      for (let j = 0; j < maxLen; j++) {
        rows.push({
          left: j < deleteLines.length ? deleteLines[j] : null,
          right: j < addLines.length ? addLines[j] : null,
        });
      }
      continue;
    }

    if (line.type === 'add') {
      rows.push({ left: null, right: line });
      i++;
      continue;
    }

    i++;
  }

  return rows;
}

function renderWordDiff(line: DiffLineType) {
  if (!line.wordDiff || line.wordDiff.length === 0) {
    return <span>{line.content || '\n'}</span>;
  }

  return (
    <>
      {line.wordDiff.map((seg, i) => {
        if (seg.type === 'equal') {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.type === 'delete' && line.type === 'delete') {
          return (
            <span key={i} className={styles.wordDel}>
              {seg.text}
            </span>
          );
        }
        if (seg.type === 'insert' && line.type === 'add') {
          return (
            <span key={i} className={styles.wordAdd}>
              {seg.text}
            </span>
          );
        }
        return null;
      })}
    </>
  );
}

function SplitCell(props: { line: DiffLineType | null; side: 'left' | 'right' }) {
  const { line, side } = props;

  if (!line) {
    return (
      <>
        <td className={styles.lineNum}></td>
        <td className={`${styles.code} ${styles.empty}`}></td>
      </>
    );
  }

  const cellClass =
    line.type === 'add'
      ? styles.add
      : line.type === 'delete'
        ? styles.del
        : styles.context;

  const lineNum = side === 'left' ? line.oldLineNumber : line.newLineNumber;

  return (
    <>
      <td className={`${styles.lineNum} ${cellClass}`}>
        {lineNum ?? ''}
      </td>
      <td className={`${styles.code} ${cellClass}`}>
        <span className={styles.codeInner}>{renderWordDiff(line)}</span>
      </td>
    </>
  );
}

export function HunkBlockSplit(props: HunkBlockSplitProps) {
  const { hunk } = props;
  const rows = buildSplitRows(hunk.lines);

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
      {rows.map((row, i) => (
        <tr key={i} className={styles.row}>
          <SplitCell line={row.left} side="left" />
          <SplitCell line={row.right} side="right" />
        </tr>
      ))}
    </tbody>
  );
}
