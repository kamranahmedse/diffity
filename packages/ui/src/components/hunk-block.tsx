import type { DiffHunk } from '@diffity/parser';
import type { SyntaxToken } from '../lib/syntax-token.js';
import { DiffLine } from './diff-line.js';
import { HunkHeader, type ExpandControls } from './hunk-header.js';

interface HunkBlockProps {
  hunk: DiffHunk;
  syntaxMap?: Map<string, SyntaxToken[]>;
  expandControls?: ExpandControls;
  topExpansionRows?: React.ReactNode[];
  bottomExpansionRows?: React.ReactNode[];
}

export function HunkBlock(props: HunkBlockProps) {
  const { hunk, syntaxMap, expandControls, topExpansionRows, bottomExpansionRows } = props;

  return (
    <tbody className={expandControls?.wasExpanded && expandControls.remainingLines <= 0 ? '' : 'border-t border-border-muted'}>
      <HunkHeader hunk={hunk} expandControls={expandControls} />
      {topExpansionRows}
      {bottomExpansionRows}
      {hunk.lines.map((line, i) => {
        const num = line.type === 'delete' ? line.oldLineNumber : line.newLineNumber;
        const key = num !== null ? `${line.type}-${num}` : `line-${i}`;
        const tokens = syntaxMap?.get(key);
        return <DiffLine key={key} line={line} syntaxTokens={tokens} />;
      })}
    </tbody>
  );
}
