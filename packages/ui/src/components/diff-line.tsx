import type { DiffLine as DiffLineType } from '@diffity/parser';
import { cn } from '../lib/cn.js';
import { getLineBg } from '../lib/diff-utils.js';
import { renderContent } from '../lib/render-content.js';
import type { SyntaxToken } from '../lib/syntax-token.js';
import { CommentLineNumber } from './comment-line-number.js';
import { UndoIcon } from './icons/undo-icon.js';
import type { CommentSide } from '../types/comment.js';

export type { SyntaxToken };

interface DiffLineProps {
  line: DiffLineType;
  syntaxTokens?: SyntaxToken[];
  expanded?: boolean;
  isSelected?: boolean;
  onLineMouseDown?: (line: number, side: CommentSide) => void;
  onLineMouseEnter?: (line: number, side: CommentSide) => void;
  onCommentClick?: (line: number, side: CommentSide) => void;
  onUndo?: () => void;
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
  const { line, syntaxTokens, expanded, isSelected, onLineMouseDown, onLineMouseEnter, onCommentClick, onUndo } = props;

  const side: CommentSide = line.type === 'delete' ? 'old' : 'new';
  const activeLine = side === 'old' ? line.oldLineNumber : line.newLineNumber;
  const gutterBg = expanded ? 'bg-diff-expanded-gutter' : '';

  return (
    <tr className={cn('group/row font-mono text-sm leading-6 hover:brightness-[0.97]', expanded ? 'bg-diff-expanded-bg' : getLineBg(line.type))}>
      <CommentLineNumber
        lineNumber={line.oldLineNumber}
        className={cn('border-r border-border-muted', gutterBg)}
        showCommentButton={!!onCommentClick && line.type === 'delete' && line.oldLineNumber !== null}
        isSelected={isSelected && side === 'old'}
        onMouseDown={line.oldLineNumber !== null ? () => onLineMouseDown?.(line.oldLineNumber!, line.type === 'delete' ? 'old' : 'new') : undefined}
        onMouseEnter={line.oldLineNumber !== null ? () => onLineMouseEnter?.(line.oldLineNumber!, line.type === 'delete' ? 'old' : 'new') : undefined}
        onCommentClick={line.oldLineNumber !== null && line.type === 'delete' ? () => onCommentClick?.(line.oldLineNumber!, 'old') : undefined}
      />
      <CommentLineNumber
        lineNumber={line.newLineNumber}
        className={cn('border-r border-border-muted', gutterBg)}
        showCommentButton={!!onCommentClick && line.type !== 'delete' && line.newLineNumber !== null}
        isSelected={isSelected && side === 'new'}
        onMouseDown={line.newLineNumber !== null ? () => onLineMouseDown?.(line.newLineNumber!, line.type === 'delete' ? 'old' : 'new') : undefined}
        onMouseEnter={line.newLineNumber !== null ? () => onLineMouseEnter?.(line.newLineNumber!, line.type === 'delete' ? 'old' : 'new') : undefined}
        onCommentClick={line.newLineNumber !== null && line.type !== 'delete' ? () => onCommentClick?.(line.newLineNumber!, 'new') : undefined}
      />
      <td className={cn('w-5 min-w-5 px-1 text-center select-none align-top', getPrefixColor(line.type), isSelected && 'bg-diff-comment-bg')}>
        {getPrefix(line.type)}
      </td>
      <td className={cn('px-3 whitespace-pre-wrap break-all relative', isSelected && 'bg-diff-comment-bg')}>
        <span className="inline">{renderContent(line, syntaxTokens)}</span>
        {onUndo && (
          <button
            onClick={onUndo}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-deleted/15 text-deleted hover:bg-deleted/25 transition-colors cursor-pointer opacity-0 group-hover/row:opacity-100"
            title="Undo this change"
          >
            <UndoIcon className="w-3 h-3" />
            Undo
          </button>
        )}
      </td>
    </tr>
  );
}
