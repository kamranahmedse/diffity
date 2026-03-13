import type { DiffLine as DiffLineType } from '@diffity/parser';
import { cn } from '../lib/cn.js';
import { getLineBg } from '../lib/diff-utils.js';
import { WordDiff } from './word-diff.js';
import { LineNumberCell } from './line-number-cell.js';

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
    return <WordDiff line={line} />;
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

function getPrefixColor(type: string): string {
  switch (type) {
    case 'add':
      return 'text-added';
    case 'delete':
      return 'text-deleted';
    default:
      return 'text-text-muted';
  }
}

export function DiffLine(props: DiffLineProps) {
  const { line, syntaxTokens } = props;

  return (
    <tr className={cn('font-mono text-sm leading-5 hover:brightness-[0.97]', getLineBg(line.type))}>
      <LineNumberCell lineNumber={line.oldLineNumber} className="border-r border-border-muted hover:text-accent" />
      <LineNumberCell lineNumber={line.newLineNumber} className="border-r border-border-muted hover:text-accent" />
      <td className={cn('w-5 min-w-5 px-1 text-center select-none align-top', getPrefixColor(line.type))}>
        {getPrefix(line.type)}
      </td>
      <td className="px-3 whitespace-pre overflow-x-auto break-all">
        <span className="inline">{renderContent(line, syntaxTokens)}</span>
      </td>
    </tr>
  );
}
