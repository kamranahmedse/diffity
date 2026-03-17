import { useState, useMemo } from 'react';
import type { DiffHunk, DiffLine as DiffLineType } from '@diffity/parser';
import { cn } from '../lib/cn';
import { getLineBg, getChangeGroups } from '../lib/diff-utils';
import { renderContent } from '../lib/render-content';
import type { SyntaxToken } from '../lib/syntax-token';
import type { CommentThread as CommentThreadType, CommentAuthor, CommentSide, LineSelection, LineRenderProps } from '../types/comment';
import { HunkHeader, type ExpandControls } from './hunk-header';
import { CommentLineNumber } from './comment-line-number';
import { CommentThread } from './comment-thread';
import { CommentFormRow } from './comment-form-row';
import { UndoIcon } from './icons/undo-icon';

interface HunkBlockSplitProps {
  hunk: DiffHunk;
  syntaxMap?: Map<string, SyntaxToken[]>;
  expandControls?: ExpandControls;
  topExpansionLines?: DiffLineType[];
  bottomExpansionLines?: DiffLineType[];
  expansionSyntaxMap?: Map<string, SyntaxToken[]>;
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
  onEditComment?: (commentId: string, body: string) => void;
  onDeleteComment?: (threadId: string, commentId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onCancelPending?: () => void;
  filePath?: string;
  onRevertChange?: (hunk: DiffHunk, startIndex: number, endIndex: number) => void;
  getOriginalCode?: (side: CommentSide, startLine: number, endLine: number) => string;
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
  expanded?: boolean;
  isSelected?: boolean;
  onMouseDown?: () => void;
  onMouseEnter?: () => void;
  onCommentClick?: () => void;
  onUndo?: () => void;
}) {
  const { line, side, syntaxMap, expanded, isSelected, onMouseDown, onMouseEnter, onCommentClick, onUndo } = props;
  const [contentHovered, setContentHovered] = useState(false);

  if (!line) {
    return (
      <>
        <CommentLineNumber lineNumber={null} className="diff-empty-cell" />
        <td className="px-3 whitespace-pre border-r border-border-muted align-top diff-empty-cell"></td>
      </>
    );
  }

  const bgClass = expanded ? 'bg-diff-expanded-gutter' : getCellBg(line);
  const contentBgClass = expanded ? 'bg-diff-expanded-bg' : getCellBg(line);
  const lineNum = side === 'left' ? line.oldLineNumber : line.newLineNumber;
  const syntaxKey = getSyntaxKey(line);
  const tokens = syntaxMap?.get(syntaxKey);

  return (
    <>
      <CommentLineNumber
        lineNumber={lineNum}
        className={bgClass}
        isSelected={isSelected}
        showCommentButton={!!onCommentClick && lineNum !== null}
        forceShowButton={contentHovered}
        onMouseDown={onMouseDown}
        onMouseEnter={onMouseEnter}
        onCommentClick={onCommentClick}
      />
      <td
        className={cn('px-3 whitespace-pre-wrap break-all border-r border-border-muted align-top relative', isSelected ? 'bg-diff-comment-bg' : contentBgClass)}
        onMouseEnter={() => setContentHovered(true)}
        onMouseLeave={() => setContentHovered(false)}
      >
        <span className="inline">{renderContent(line, tokens)}</span>
        {onUndo && (
          <button
            onClick={onUndo}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-deleted/15 text-deleted hover:bg-deleted/25 transition-colors cursor-pointer opacity-0 group-hover/split-row:opacity-100"
            title="Undo this change"
          >
            <UndoIcon className="w-3 h-3" />
            Undo
          </button>
        )}
      </td>
    </>
  );
}

export function renderSplitRows(
  lines: DiffLineType[],
  expanded: boolean,
  syntaxMap: Map<string, SyntaxToken[]> | undefined,
  keyPrefix: string,
  props: LineRenderProps,
  undoForRow?: Map<number, () => void>,
): React.ReactNode[] {
  const splitRows = buildSplitRows(lines);
  const result: React.ReactNode[] = [];

  for (let i = 0; i < splitRows.length; i++) {
    const row = splitRows[i];
    const leftLine = row.left;
    const rightLine = row.right;
    const leftNum = leftLine?.oldLineNumber ?? null;
    const rightNum = rightLine?.newLineNumber ?? null;
    const onUndo = undoForRow?.get(i);

    result.push(
      <tr key={`${keyPrefix}-${i}`} className="group/split-row font-mono text-sm leading-6">
        <SplitCell
          line={leftLine}
          side="left"
          syntaxMap={syntaxMap}
          expanded={expanded}
          isSelected={leftNum !== null ? props.isLineSelected?.(leftNum, 'old') : false}
          onMouseDown={leftNum !== null ? () => props.onLineMouseDown?.(leftNum, 'old') : undefined}
          onMouseEnter={leftNum !== null ? () => props.onLineMouseEnter?.(leftNum, 'old') : undefined}
          onCommentClick={leftNum !== null && props.onCommentClick ? () => props.onCommentClick!(leftNum, 'old') : undefined}
          onUndo={onUndo && !rightLine ? onUndo : undefined}
        />
        <SplitCell
          line={rightLine}
          side="right"
          syntaxMap={syntaxMap}
          expanded={expanded}
          isSelected={rightNum !== null ? props.isLineSelected?.(rightNum, 'new') : false}
          onMouseDown={rightNum !== null ? () => props.onLineMouseDown?.(rightNum, 'new') : undefined}
          onMouseEnter={rightNum !== null ? () => props.onLineMouseEnter?.(rightNum, 'new') : undefined}
          onCommentClick={rightNum !== null && props.onCommentClick ? () => props.onCommentClick!(rightNum, 'new') : undefined}
          onUndo={onUndo && rightLine ? onUndo : undefined}
        />
      </tr>
    );

    const threadRows: React.ReactNode[] = [];

    if (leftNum !== null && props.threads) {
      const leftThreads = props.threads.filter(t => t.endLine === leftNum && t.side === 'old');
      for (const thread of leftThreads) {
        threadRows.push(
          <CommentThread
            key={`thread-${thread.id}`}
            thread={thread}
            onReply={props.onReply!}
            onResolve={props.onResolve!}
            onUnresolve={props.onUnresolve!}
            onEditComment={props.onEditComment!}
            onDeleteComment={props.onDeleteComment!}
            onDeleteThread={props.onDeleteThread!}
            currentAuthor={props.currentAuthor!}
            colSpan={2}
            viewMode="split"
            side="old"
            currentCode={props.getOriginalCode?.(thread.side, thread.startLine, thread.endLine)}
          />
        );
      }
    }

    if (rightNum !== null && props.threads) {
      const rightThreads = props.threads.filter(t => t.endLine === rightNum && t.side === 'new');
      for (const thread of rightThreads) {
        threadRows.push(
          <CommentThread
            key={`thread-${thread.id}`}
            thread={thread}
            onReply={props.onReply!}
            onResolve={props.onResolve!}
            onUnresolve={props.onUnresolve!}
            onEditComment={props.onEditComment!}
            onDeleteComment={props.onDeleteComment!}
            onDeleteThread={props.onDeleteThread!}
            currentAuthor={props.currentAuthor!}
            colSpan={2}
            viewMode="split"
            side="new"
            currentCode={props.getOriginalCode?.(thread.side, thread.startLine, thread.endLine)}
          />
        );
      }
    }

    if (props.pendingSelection && props.filePath && props.currentAuthor && props.onAddThread && props.onCancelPending) {
      const showForLeft = leftNum !== null && props.pendingSelection.endLine === leftNum && props.pendingSelection.side === 'old';
      const showForRight = rightNum !== null && props.pendingSelection.endLine === rightNum && props.pendingSelection.side === 'new';
      if (showForLeft || showForRight) {
        threadRows.push(
          <CommentFormRow
            key="pending-comment"
            colSpan={2}
            filePath={props.filePath}
            side={props.pendingSelection.side}
            startLine={props.pendingSelection.startLine}
            endLine={props.pendingSelection.endLine}
            currentAuthor={props.currentAuthor}
            onSubmit={props.onAddThread}
            onCancel={props.onCancelPending}
            viewMode="split"
          />
        );
      }
    }

    if (threadRows.length > 0) {
      result.push(...threadRows);
    }
  }

  return result;
}

export function HunkBlockSplit(props: HunkBlockSplitProps) {
  const {
    hunk, syntaxMap, expandControls, topExpansionLines, bottomExpansionLines, expansionSyntaxMap,
    threads, pendingSelection, currentAuthor, isLineSelected,
    onLineMouseDown, onLineMouseEnter, onCommentClick,
    onAddThread, onReply, onResolve, onUnresolve, onEditComment, onDeleteComment, onDeleteThread,
    onCancelPending, filePath, onRevertChange, getOriginalCode,
  } = props;

  const commentProps = {
    isLineSelected, onLineMouseDown, onLineMouseEnter, onCommentClick,
    threads, pendingSelection, currentAuthor,
    onAddThread, onReply, onResolve, onUnresolve, onEditComment, onDeleteComment, onDeleteThread,
    onCancelPending, filePath, getOriginalCode,
  };

  const undoForRow = useMemo(() => {
    if (!onRevertChange) {
      return undefined;
    }
    const groups = getChangeGroups(hunk.lines);
    const splitRows = buildSplitRows(hunk.lines);
    const map = new Map<number, () => void>();

    for (const group of groups) {
      let lastSplitRowIdx = -1;
      for (let ri = 0; ri < splitRows.length; ri++) {
        const row = splitRows[ri];
        const leftIsChange = row.left && row.left.type !== 'context';
        const rightIsChange = row.right && row.right.type !== 'context';
        if (leftIsChange || rightIsChange) {
          const nextRow = splitRows[ri + 1];
          const nextIsContext = !nextRow || ((!nextRow.left || nextRow.left.type === 'context') && (!nextRow.right || nextRow.right.type === 'context'));
          if (nextIsContext) {
            const leftInGroup = row.left && row.left.type !== 'context' && hunk.lines.indexOf(row.left) >= group.startIndex && hunk.lines.indexOf(row.left) <= group.endIndex;
            const rightInGroup = row.right && row.right.type !== 'context' && hunk.lines.indexOf(row.right) >= group.startIndex && hunk.lines.indexOf(row.right) <= group.endIndex;
            if (leftInGroup || rightInGroup) {
              lastSplitRowIdx = ri;
            }
          }
        }
      }
      if (lastSplitRowIdx >= 0) {
        const g = group;
        map.set(lastSplitRowIdx, () => onRevertChange(hunk, g.startIndex, g.endIndex));
      }
    }

    return map;
  }, [hunk, onRevertChange]);

  const rows: React.ReactNode[] = [];

  if (topExpansionLines && topExpansionLines.length > 0) {
    rows.push(...renderSplitRows(topExpansionLines, true, expansionSyntaxMap, 'top-exp', commentProps));
  }

  if (bottomExpansionLines && bottomExpansionLines.length > 0) {
    rows.push(...renderSplitRows(bottomExpansionLines, true, expansionSyntaxMap, 'bot-exp', commentProps));
  }

  rows.push(...renderSplitRows(hunk.lines, false, syntaxMap, 'hunk', commentProps, undoForRow));

  return (
    <tbody className={expandControls?.wasExpanded && expandControls.remainingLines <= 0 ? '' : 'border-t border-border-muted'}>
      <HunkHeader hunk={hunk} expandControls={expandControls} />
      {rows}
    </tbody>
  );
}
