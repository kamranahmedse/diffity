import type { DiffHunk } from '@diffity/parser';
import { DiffLine, type SyntaxToken } from './diff-line.js';
import { HunkHeader } from './hunk-header.js';

interface HunkBlockProps {
  hunk: DiffHunk;
  syntaxMap?: Map<string, SyntaxToken[]>;
}

export function HunkBlock(props: HunkBlockProps) {
  const { hunk, syntaxMap } = props;

  return (
    <tbody className="border-t border-border-muted">
      <HunkHeader hunk={hunk} />
      {hunk.lines.map((line, i) => {
        const num = line.type === 'delete' ? line.oldLineNumber : line.newLineNumber;
        const key = num !== null ? `${line.type}-${num}` : `line-${i}`;
        const tokens = syntaxMap?.get(key);
        return <DiffLine key={key} line={line} syntaxTokens={tokens} />;
      })}
    </tbody>
  );
}
