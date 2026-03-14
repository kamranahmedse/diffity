import type { DiffLine as DiffLineType } from '@diffity/parser';
import type { HighlightedTokens } from '../hooks/use-highlighter.js';
import type { ViewMode } from '../lib/diff-utils.js';
import { LineNumberCell } from './line-number-cell.js';

interface ContextRowProps {
  line: DiffLineType;
  viewMode: ViewMode;
  highlightLine?: (code: string) => HighlightedTokens[] | null;
}

export function ContextRow(props: ContextRowProps) {
  const { line, viewMode, highlightLine } = props;

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
      <tr className="font-mono text-sm leading-6 bg-diff-expanded-bg">
        <LineNumberCell lineNumber={line.oldLineNumber} className="border-r border-border-muted bg-diff-expanded-gutter" />
        <td className="px-3 whitespace-pre-wrap break-all border-r border-border-muted align-top">
          <span className="inline">{renderedContent}</span>
        </td>
        <LineNumberCell lineNumber={line.newLineNumber} className="border-r border-border-muted bg-diff-expanded-gutter" />
        <td className="px-3 whitespace-pre-wrap break-all border-r border-border-muted align-top">
          <span className="inline">{renderedContent}</span>
        </td>
      </tr>
    );
  }

  return (
    <tr className="font-mono text-sm leading-6 bg-diff-expanded-bg">
      <LineNumberCell lineNumber={line.oldLineNumber} className="border-r border-border-muted bg-diff-expanded-gutter" />
      <LineNumberCell lineNumber={line.newLineNumber} className="border-r border-border-muted bg-diff-expanded-gutter" />
      <td className="w-5 min-w-5 px-1 text-center select-none align-top text-text-muted"> </td>
      <td className="px-3 whitespace-pre-wrap break-all">
        <span className="inline">{renderedContent}</span>
      </td>
    </tr>
  );
}
