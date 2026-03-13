import type { DiffLine as DiffLineType } from '@diffity/parser';
import styles from './diff-line.module.css';

export interface SyntaxToken {
  text: string;
  color?: string;
}

interface DiffLineProps {
  line: DiffLineType;
  syntaxTokens?: SyntaxToken[];
}

function renderContent(line: DiffLineType, syntaxTokens?: SyntaxToken[]) {
  if (line.wordDiff && line.wordDiff.length > 0) {
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

  if (syntaxTokens && syntaxTokens.length > 0) {
    return (
      <>
        {syntaxTokens.map((token, i) => (
          <span key={i} style={token.color ? { color: token.color } : undefined}>
            {token.text}
          </span>
        ))}
      </>
    );
  }

  return <span>{line.content || '\n'}</span>;
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
  const { line, syntaxTokens } = props;

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
        <span className={styles.codeInner}>
          {renderContent(line, syntaxTokens)}
        </span>
      </td>
    </tr>
  );
}
