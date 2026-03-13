import type { DiffHunk, DiffLine as DiffLineType } from '@diffity/parser';
import { cn } from '../lib/cn.js';
import { getLineBg } from '../lib/diff-utils.js';
import { WordDiff } from './word-diff.js';
import { HunkHeader } from './hunk-header.js';
import { LineNumberCell } from './line-number-cell.js';

interface HunkBlockSplitProps {
  hunk: DiffHunk;
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

function SplitCell(props: { line: DiffLineType | null; side: 'left' | 'right' }) {
  const { line, side } = props;

  if (!line) {
    return (
      <>
        <LineNumberCell lineNumber={null} className="bg-bg-secondary" />
        <td className="px-3 whitespace-pre overflow-hidden border-r border-border-muted align-top bg-bg-secondary"></td>
      </>
    );
  }

  const bgClass = getCellBg(line);
  const lineNum = side === 'left' ? line.oldLineNumber : line.newLineNumber;

  return (
    <>
      <LineNumberCell lineNumber={lineNum} className={bgClass} />
      <td className={cn('px-3 whitespace-pre overflow-hidden border-r border-border-muted align-top', bgClass)}>
        <span className="inline"><WordDiff line={line} /></span>
      </td>
    </>
  );
}

export function HunkBlockSplit(props: HunkBlockSplitProps) {
  const { hunk } = props;
  const rows = buildSplitRows(hunk.lines);

  return (
    <tbody className="border-t border-border-muted">
      <HunkHeader hunk={hunk} />
      {rows.map((row, i) => (
        <tr key={i} className="font-mono text-sm leading-5">
          <SplitCell line={row.left} side="left" />
          <SplitCell line={row.right} side="right" />
        </tr>
      ))}
    </tbody>
  );
}
