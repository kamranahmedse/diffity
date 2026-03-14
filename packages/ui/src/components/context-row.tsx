import type { DiffLine as DiffLineType } from '@diffity/parser';
import type { HighlightedTokens } from '../hooks/use-highlighter.js';
import type { ViewMode } from '../lib/diff-utils.js';
import type { CommentSide } from '../types/comment.js';
import { CommentLineNumber } from './comment-line-number.js';

interface ContextRowProps {
  line: DiffLineType;
  viewMode: ViewMode;
  highlightLine?: (code: string) => HighlightedTokens[] | null;
  onLineMouseDown?: (line: number, side: CommentSide) => void;
  onLineMouseEnter?: (line: number, side: CommentSide) => void;
  onCommentClick?: (line: number, side: CommentSide) => void;
}

export function ContextRow(props: ContextRowProps) {
  const { line, viewMode, highlightLine, onLineMouseDown, onLineMouseEnter, onCommentClick } = props;

  let renderedContent: React.ReactNode = line.content || '\n';
  if (highlightLine && line.content) {
    const highlighted = highlightLine(line.content);
    if (highlighted && highlighted.length > 0) {
      renderedContent = highlighted[0].tokens.map((token: { text: string; color?: string }, i: number) => (
        <span key={i} style={token.color ? { color: token.color } : undefined}>{token.text}</span>
      ));
    }
  }

  if (viewMode === 'split') {
    return (
      <tr className="group/row font-mono text-sm leading-6 bg-diff-expanded-bg">
        <CommentLineNumber
          lineNumber={line.oldLineNumber}
          className="border-r border-border-muted bg-diff-expanded-gutter"
          showCommentButton={line.oldLineNumber !== null}
          onMouseDown={line.oldLineNumber !== null ? () => onLineMouseDown?.(line.oldLineNumber!, 'old') : undefined}
          onMouseEnter={line.oldLineNumber !== null ? () => onLineMouseEnter?.(line.oldLineNumber!, 'old') : undefined}
          onCommentClick={line.oldLineNumber !== null ? () => onCommentClick?.(line.oldLineNumber!, 'old') : undefined}
        />
        <td className="px-3 whitespace-pre-wrap break-all border-r border-border-muted align-top">
          <span className="inline">{renderedContent}</span>
        </td>
        <CommentLineNumber
          lineNumber={line.newLineNumber}
          className="border-r border-border-muted bg-diff-expanded-gutter"
          showCommentButton={line.newLineNumber !== null}
          onMouseDown={line.newLineNumber !== null ? () => onLineMouseDown?.(line.newLineNumber!, 'new') : undefined}
          onMouseEnter={line.newLineNumber !== null ? () => onLineMouseEnter?.(line.newLineNumber!, 'new') : undefined}
          onCommentClick={line.newLineNumber !== null ? () => onCommentClick?.(line.newLineNumber!, 'new') : undefined}
        />
        <td className="px-3 whitespace-pre-wrap break-all border-r border-border-muted align-top">
          <span className="inline">{renderedContent}</span>
        </td>
      </tr>
    );
  }

  return (
    <tr className="group/row font-mono text-sm leading-6 bg-diff-expanded-bg">
      <CommentLineNumber
        lineNumber={line.oldLineNumber}
        className="border-r border-border-muted bg-diff-expanded-gutter"
        showCommentButton={false}
        onMouseDown={line.oldLineNumber !== null ? () => onLineMouseDown?.(line.oldLineNumber!, 'new') : undefined}
        onMouseEnter={line.oldLineNumber !== null ? () => onLineMouseEnter?.(line.oldLineNumber!, 'new') : undefined}
      />
      <CommentLineNumber
        lineNumber={line.newLineNumber}
        className="border-r border-border-muted bg-diff-expanded-gutter"
        showCommentButton={line.newLineNumber !== null}
        onMouseDown={line.newLineNumber !== null ? () => onLineMouseDown?.(line.newLineNumber!, 'new') : undefined}
        onMouseEnter={line.newLineNumber !== null ? () => onLineMouseEnter?.(line.newLineNumber!, 'new') : undefined}
        onCommentClick={line.newLineNumber !== null ? () => onCommentClick?.(line.newLineNumber!, 'new') : undefined}
      />
      <td className="w-5 min-w-5 px-1 text-center select-none align-top text-text-muted"> </td>
      <td className="px-3 whitespace-pre-wrap break-all">
        <span className="inline">{renderedContent}</span>
      </td>
    </tr>
  );
}
