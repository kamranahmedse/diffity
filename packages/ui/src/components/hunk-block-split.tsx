import { useState } from 'react';
import type { DiffHunk, DiffLine as DiffLineType } from '@diffity/parser';
import { cn } from '../lib/cn.js';
import { getLineBg } from '../lib/diff-utils.js';
import { renderContent } from '../lib/render-content.js';
import type { SyntaxToken } from '../lib/syntax-token.js';
import type { CommentThread as CommentThreadType, CommentAuthor, CommentSide, LineSelection } from '../types/comment.js';
import { HunkHeader, type ExpandControls } from './hunk-header.js';
import { CommentLineNumber } from './comment-line-number.js';
import { CommentThread } from './comment-thread.js';
import { CommentFormRow } from './comment-form-row.js';

interface HunkBlockSplitProps {
  hunk: DiffHunk;
  syntaxMap?: Map<string, SyntaxToken[]>;
  expandControls?: ExpandControls;
  topExpansionRows?: React.ReactNode[];
  bottomExpansionRows?: React.ReactNode[];
  threads?: CommentThreadType[];
  pendingSelection?: LineSelection | null;
  currentAuthor?: CommentAuthor;
  isLineSelected?: (line: number, side: CommentSide) => boolean;
  onLineMouseDown?: (line: number, side: CommentSide) => void;
  onLineMouseEnter?: (line: number, side: CommentSide) => void;
  onCommentClick?: (line: number, side: CommentSide) => void;
  onAddThread?: (filePath: string, side: CommentSide, startLine: number, endLine: number, body: string, author: CommentAuthor) => void;
  onReply?: (threadId: string, body: string, author: CommentAuthor) => void;
  onResolve?: (threadId: string) => void;
  onUnresolve?: (threadId: string) => void;
  onDeleteComment?: (threadId: string, commentId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onCancelPending?: () => void;
  filePath?: string;
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

function getSyntaxKey(line: DiffLineType): string {
  const num = line.type === 'delete' ? line.oldLineNumber : line.newLineNumber;
  return `${line.type}-${num}`;
}

function SplitCell(props: {
  line: DiffLineType | null;
  side: 'left' | 'right';
  syntaxMap?: Map<string, SyntaxToken[]>;
  isSelected?: boolean;
  onMouseDown?: () => void;
  onMouseEnter?: () => void;
  onCommentClick?: () => void;
}) {
  const { line, side, syntaxMap, isSelected, onMouseDown, onMouseEnter, onCommentClick } = props;
  const [contentHovered, setContentHovered] = useState(false);

  if (!line) {
    return (
      <>
        <CommentLineNumber lineNumber={null} className="diff-empty-cell" />
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
      <CommentLineNumber
        lineNumber={lineNum}
        className={bgClass}
        isSelected={isSelected}
        showCommentButton={lineNum !== null}
        forceShowButton={contentHovered}
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        onCommentClick={onCommentClick}
      />
      <td
        className={cn('px-3 whitespace-pre-wrap break-all border-r border-border-muted align-top', isSelected ? 'bg-diff-comment-bg' : bgClass)}
        onMouseEnter={() => setContentHovered(true)}
        onMouseLeave={() => setContentHovered(false)}
      >
        <span className="inline">{renderContent(line, tokens)}</span>
      </td>
    </>
  );
}

export function HunkBlockSplit(props: HunkBlockSplitProps) {
  const {
    hunk, syntaxMap, expandControls, topExpansionRows, bottomExpansionRows,
    threads, pendingSelection, currentAuthor, isLineSelected,
    onLineMouseDown, onLineMouseEnter, onCommentClick,
    onAddThread, onReply, onResolve, onUnresolve, onDeleteComment, onDeleteThread,
    onCancelPending, filePath,
  } = props;
  const splitRows = buildSplitRows(hunk.lines);

  const rows: React.ReactNode[] = [];

  for (let i = 0; i < splitRows.length; i++) {
    const row = splitRows[i];

    const leftLine = row.left;
    const rightLine = row.right;
    const leftNum = leftLine?.oldLineNumber ?? null;
    const rightNum = rightLine?.newLineNumber ?? null;

    rows.push(
      <tr key={i} className="font-mono text-sm leading-6">
        <SplitCell
          line={leftLine}
          side="left"
          syntaxMap={syntaxMap}
          isSelected={leftNum !== null ? isLineSelected?.(leftNum, 'old') : false}
          onMouseDown={leftNum !== null ? () => onLineMouseDown?.(leftNum, 'old') : undefined}
          onMouseEnter={leftNum !== null ? () => onLineMouseEnter?.(leftNum, 'old') : undefined}
          onCommentClick={leftNum !== null ? () => onCommentClick?.(leftNum, 'old') : undefined}
        />
        <SplitCell
          line={rightLine}
          side="right"
          syntaxMap={syntaxMap}
          isSelected={rightNum !== null ? isLineSelected?.(rightNum, 'new') : false}
          onMouseDown={rightNum !== null ? () => onLineMouseDown?.(rightNum, 'new') : undefined}
          onMouseEnter={rightNum !== null ? () => onLineMouseEnter?.(rightNum, 'new') : undefined}
          onCommentClick={rightNum !== null ? () => onCommentClick?.(rightNum, 'new') : undefined}
        />
      </tr>
    );

    // Render threads/forms after the relevant line
    const threadRows: React.ReactNode[] = [];

    if (leftNum !== null && threads) {
      const leftThreads = threads.filter(t => t.endLine === leftNum && t.side === 'old');
      for (const thread of leftThreads) {
        threadRows.push(
          <CommentThread
            key={`thread-${thread.id}`}
            thread={thread}
            onReply={onReply!}
            onResolve={onResolve!}
            onUnresolve={onUnresolve!}
            onDeleteComment={onDeleteComment!}
            onDeleteThread={onDeleteThread!}
            currentAuthor={currentAuthor!}
            colSpan={2}
            viewMode="split"
            side="old"
          />
        );
      }
    }

    if (rightNum !== null && threads) {
      const rightThreads = threads.filter(t => t.endLine === rightNum && t.side === 'new');
      for (const thread of rightThreads) {
        threadRows.push(
          <CommentThread
            key={`thread-${thread.id}`}
            thread={thread}
            onReply={onReply!}
            onResolve={onResolve!}
            onUnresolve={onUnresolve!}
            onDeleteComment={onDeleteComment!}
            onDeleteThread={onDeleteThread!}
            currentAuthor={currentAuthor!}
            colSpan={2}
            viewMode="split"
            side="new"
          />
        );
      }
    }

    if (pendingSelection && filePath && currentAuthor && onAddThread && onCancelPending) {
      const showForLeft = leftNum !== null && pendingSelection.endLine === leftNum && pendingSelection.side === 'old';
      const showForRight = rightNum !== null && pendingSelection.endLine === rightNum && pendingSelection.side === 'new';
      if (showForLeft || showForRight) {
        threadRows.push(
          <CommentFormRow
            key="pending-comment"
            colSpan={2}
            filePath={filePath}
            side={pendingSelection.side}
            startLine={pendingSelection.startLine}
            endLine={pendingSelection.endLine}
            currentAuthor={currentAuthor}
            onSubmit={onAddThread}
            onCancel={onCancelPending}
            viewMode="split"
          />
        );
      }
    }

    if (threadRows.length > 0) {
      rows.push(...threadRows);
    }
  }

  return (
    <tbody className={expandControls?.wasExpanded && expandControls.remainingLines <= 0 ? '' : 'border-t border-border-muted'}>
      <HunkHeader hunk={hunk} expandControls={expandControls} />
      {topExpansionRows}
      {bottomExpansionRows}
      {rows}
    </tbody>
  );
}
