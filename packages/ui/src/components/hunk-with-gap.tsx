import type { DiffHunk, DiffLine as DiffLineType } from '@diffity/parser';
import type { SyntaxToken } from '../lib/syntax-token.js';
import type { HighlightedTokens } from '../hooks/use-highlighter.js';
import type { ViewMode } from '../lib/diff-utils.js';
import type { ExpandControls } from './hunk-header.js';
import { HunkBlock } from './hunk-block.js';
import { HunkBlockSplit } from './hunk-block-split.js';
import { ContextRow } from './context-row.js';

interface GapExpansion {
  fromTop: number;
  fromBottom: number;
  linesFromTop: DiffLineType[];
  linesFromBottom: DiffLineType[];
}

interface HunkWithGapProps {
  hunk: DiffHunk;
  viewMode: ViewMode;
  syntaxMap?: Map<string, SyntaxToken[]>;
  expandControls?: ExpandControls;
  topExpansionLines?: DiffLineType[];
  gapExpansion?: GapExpansion;
  gapId?: string;
  highlightLine?: (code: string) => HighlightedTokens[] | null;
}

export function HunkWithGap(props: HunkWithGapProps) {
  const { hunk, viewMode, syntaxMap, expandControls, topExpansionLines, gapExpansion, gapId, highlightLine } = props;

  const HunkComponent = viewMode === 'split' ? HunkBlockSplit : HunkBlock;

  const topExpansionRows = topExpansionLines && topExpansionLines.length > 0
    ? topExpansionLines.map((line) => (
        <ContextRow key={`top-${line.oldLineNumber}`} line={line} viewMode={viewMode} highlightLine={highlightLine} />
      ))
    : undefined;

  const gapBottomRows = gapExpansion && gapExpansion.linesFromBottom.length > 0
    ? gapExpansion.linesFromBottom.map((line) => (
        <ContextRow key={`${gapId}-bot-${line.oldLineNumber}`} line={line} viewMode={viewMode} highlightLine={highlightLine} />
      ))
    : undefined;

  return (
    <>
      {gapExpansion && gapExpansion.linesFromTop.length > 0 && (
        <tbody>
          {gapExpansion.linesFromTop.map((line) => (
            <ContextRow key={`${gapId}-top-${line.oldLineNumber}`} line={line} viewMode={viewMode} highlightLine={highlightLine} />
          ))}
        </tbody>
      )}
      <HunkComponent hunk={hunk} syntaxMap={syntaxMap} expandControls={expandControls} topExpansionRows={topExpansionRows} bottomExpansionRows={gapBottomRows} />
    </>
  );
}
