import type { DiffLine as DiffLineType, WordDiffSegment } from '@diffity/parser';
import styles from './diff-line.module.css';

interface DiffLineProps {
  line: DiffLineType;
}

function renderContent(line: DiffLineType) {
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

function getPrefix(type: string): string {
  switch (type) {
    case 'add':
      return '+';
    case 'delete':
      return '-';
    default:
      return ' ';
  }
}

export function DiffLine(props: DiffLineProps) {
  const { line } = props;

  const lineClass =
    line.type === 'add'
      ? styles.add
      : line.type === 'delete'
        ? styles.del
        : styles.context;

  return (
    <tr className={`${styles.line} ${lineClass}`}>
      <td className={styles.lineNum}>
        {line.oldLineNumber ?? ''}
      </td>
      <td className={styles.lineNum}>
        {line.newLineNumber ?? ''}
      </td>
      <td className={styles.prefix}>{getPrefix(line.type)}</td>
      <td className={styles.code}>
        <span className={styles.codeInner}>{renderContent(line)}</span>
      </td>
    </tr>
  );
}
