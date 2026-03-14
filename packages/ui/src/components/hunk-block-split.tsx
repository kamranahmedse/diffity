import type { DiffHunk, DiffLine as DiffLineType } from '@diffity/parser';
import { cn } from '../lib/cn.js';
import { getLineBg } from '../lib/diff-utils.js';
import { WordDiff } from './word-diff.js';
import { HunkHeader, type ExpandControls } from './hunk-header.js';
import { LineNumberCell } from './line-number-cell.js';
import type { SyntaxToken } from './diff-line.js';

interface HunkBlockSplitProps {
  hunk: DiffHunk;
  syntaxMap?: Map<string, SyntaxToken[]>;
  expandControls?: ExpandControls;
  topExpansionRows?: React.ReactNode[];
  bottomExpansionRows?: React.ReactNode[];
}

interface SplitRow {
  left: DiffLineType | null;
  right: DiffLineType | null;
}

function buildSplitRows(lines: DiffLineType[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.type === 'context') {
      rows.push({ left: line, right: line });
      i++;
      continue;
    }

    if (line.type === 'delete') {
      const deleteLines: DiffLineType[] = [];
      while (i < lines.length && lines[i].type === 'delete') {
        deleteLines.push(lines[i]);
        i++;
      }

      const addLines: DiffLineType[] = [];
      while (i < lines.length && lines[i].type === 'add') {
        addLines.push(lines[i]);
        i++;
      }

      const maxLen = Math.max(deleteLines.length, addLines.length);
      for (let j = 0; j < maxLen; j++) {
        rows.push({
          left: j < deleteLines.length ? deleteLines[j] : null,
          right: j < addLines.length ? addLines[j] : null,
        });
      }
      continue;
    }

    if (line.type === 'add') {
      rows.push({ left: null, right: line });
      i++;
      continue;
    }

    i++;
  }

  return rows;
}

function getCellBg(line: DiffLineType | null): string {
  if (!line) {
    return 'bg-bg-secondary';
  }
  return getLineBg(line.type);
}

function renderCellContent(line: DiffLineType, syntaxTokens?: SyntaxToken[]) {
  if (line.wordDiff && line.wordDiff.length > 0) {
    return <WordDiff line={line} syntaxTokens={syntaxTokens} />;
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

function getSyntaxKey(line: DiffLineType): string {
  const num = line.type === 'delete' ? line.oldLineNumber : line.newLineNumber;
  return `${line.type}-${num}`;
}

function SplitCell(props: { line: DiffLineType | null; side: 'left' | 'right'; syntaxMap?: Map<string, SyntaxToken[]> }) {
  const { line, side, syntaxMap } = props;

  if (!line) {
    return (
      <>
        <LineNumberCell lineNumber={null} className="diff-empty-cell" />
        <td className="px-3 whitespace-pre border-r border-border-muted align-top diff-empty-cell"></td>
      </>
    );
  }

  const bgClass = getCellBg(line);
  const lineNum = side === 'left' ? line.oldLineNumber : line.newLineNumber;
  const syntaxKey = getSyntaxKey(line);
  const tokens = syntaxMap?.get(syntaxKey);

  return (
    <>
      <LineNumberCell lineNumber={lineNum} className={bgClass} />
      <td className={cn('px-3 whitespace-pre-wrap break-all border-r border-border-muted align-top', bgClass)}>
        <span className="inline">{renderCellContent(line, tokens)}</span>
      </td>
    </>
  );
}

export function HunkBlockSplit(props: HunkBlockSplitProps) {
  const { hunk, syntaxMap, expandControls, topExpansionRows, bottomExpansionRows } = props;
  const rows = buildSplitRows(hunk.lines);

  return (
    <tbody className={expandControls?.wasExpanded && expandControls.remainingLines <= 0 ? '' : 'border-t border-border-muted'}>
      <HunkHeader hunk={hunk} expandControls={expandControls} />
      {topExpansionRows}
      {bottomExpansionRows}
      {rows.map((row, i) => (
        <tr key={i} className="font-mono text-sm leading-6">
          <SplitCell line={row.left} side="left" syntaxMap={syntaxMap} />
          <SplitCell line={row.right} side="right" syntaxMap={syntaxMap} />
        </tr>
      ))}
    </tbody>
  );
}
