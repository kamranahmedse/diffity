import type { DiffLine as DiffLineType } from '@diffity/parser';
import type { HighlightedTokens } from '../hooks/use-highlighter.js';
import type { SyntaxToken } from '../lib/syntax-token.js';
import type { ViewMode } from '../lib/diff-utils.js';
import type { LineRenderProps } from '../types/comment.js';
import { renderLineWithComments } from './hunk-block.js';
import { renderSplitRows } from './hunk-block-split.js';

export function buildExpansionSyntaxMap(
  lines: DiffLineType[],
  highlightLine?: (code: string) => HighlightedTokens[] | null,
): Map<string, SyntaxToken[]> {
  const map = new Map<string, SyntaxToken[]>();
  if (!highlightLine) {
    return map;
  }
  for (const line of lines) {
    if (!line.content) {
      continue;
    }
    const highlighted = highlightLine(line.content);
    if (!highlighted || highlighted.length === 0) {
      continue;
    }
    const key = `${line.type}-${line.type === 'delete' ? line.oldLineNumber : line.newLineNumber}`;
    map.set(key, highlighted[0].tokens);
  }
  return map;
}

export function renderExpansionRows(
  lines: DiffLineType[],
  viewMode: ViewMode,
  keyPrefix: string,
  syntaxMap: Map<string, SyntaxToken[]> | undefined,
  props: LineRenderProps,
): React.ReactNode[] {
  if (viewMode === 'split') {
    return renderSplitRows(lines, true, syntaxMap, keyPrefix, props);
  }

  const result: React.ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    result.push(...renderLineWithComments(lines[i], i, true, syntaxMap, props));
  }
  return result;
}
