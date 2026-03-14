import type { DiffLine as DiffLineType } from '@diffity/parser';
import { cn } from '../lib/cn.js';
import { getLineBg } from '../lib/diff-utils.js';
import { renderContent } from '../lib/render-content.js';
import type { SyntaxToken } from '../lib/syntax-token.js';
import { LineNumberCell } from './line-number-cell.js';

export type { SyntaxToken };

interface DiffLineProps {
  line: DiffLineType;
  syntaxTokens?: SyntaxToken[];
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
    <tr className={cn('font-mono text-sm leading-6 hover:brightness-[0.97]', getLineBg(line.type))}>
      <LineNumberCell lineNumber={line.oldLineNumber} className="border-r border-border-muted hover:text-accent" />
      <LineNumberCell lineNumber={line.newLineNumber} className="border-r border-border-muted hover:text-accent" />
      <td className={cn('w-5 min-w-5 px-1 text-center select-none align-top', getPrefixColor(line.type))}>
        {getPrefix(line.type)}
      </td>
      <td className="px-3 whitespace-pre-wrap break-all">
        <span className="inline">{renderContent(line, syntaxTokens)}</span>
      </td>
    </tr>
  );
}
