import { useMemo } from 'react';
import type { DiffHunk, DiffLine as DiffLineType } from '@diffity/parser';
import type { SyntaxToken } from '../lib/syntax-token.js';
import type { CommentThread as CommentThreadType, CommentAuthor, CommentSide, LineSelection, LineRenderProps } from '../types/comment.js';
import { getChangeGroups } from '../lib/diff-utils.js';
import { DiffLine } from './diff-line.js';
import { HunkHeader, type ExpandControls } from './hunk-header.js';
import { CommentThread } from './comment-thread.js';
import { CommentFormRow } from './comment-form-row.js';

interface HunkBlockProps {
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
  onDeleteComment?: (threadId: string, commentId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onCancelPending?: () => void;
  filePath?: string;
  onRevertChange?: (hunk: DiffHunk, startIndex: number, endIndex: number) => void;
  getOriginalCode?: (side: CommentSide, startLine: number, endLine: number) => string;
  canApply?: boolean;
  onApplySuggestion?: (filePath: string, startLine: number, endLine: number, newContent: string) => void;
}

export function renderLineWithComments(
  line: DiffLineType,
  index: number,
  expanded: boolean,
  syntaxMap: Map<string, SyntaxToken[]> | undefined,
  props: LineRenderProps,
  onUndo?: () => void,
): React.ReactNode[] {
  const side: CommentSide = line.type === 'delete' ? 'old' : 'new';
  const activeLine = side === 'old' ? line.oldLineNumber : line.newLineNumber;
  const num = activeLine;
  const key = num !== null ? `${expanded ? 'exp-' : ''}${line.type}-${num}` : `line-${index}`;
  const syntaxKey = num !== null ? `${line.type}-${num}` : '';
  const tokens = syntaxMap?.get(syntaxKey);

  const result: React.ReactNode[] = [];

  result.push(
    <DiffLine
      key={key}
      line={line}
      syntaxTokens={tokens}
      expanded={expanded}
      isSelected={activeLine !== null ? props.isLineSelected?.(activeLine, side) : false}
      onLineMouseDown={props.onLineMouseDown}
      onLineMouseEnter={props.onLineMouseEnter}
      onCommentClick={props.onCommentClick}
      onUndo={onUndo}
    />
  );

  if (activeLine !== null && props.threads) {
    const lineThreads = props.threads.filter(t => t.endLine === activeLine && t.side === side);
    for (const thread of lineThreads) {
      result.push(
        <CommentThread
          key={`thread-${thread.id}`}
          thread={thread}
          onReply={props.onReply!}
          onResolve={props.onResolve!}
          onUnresolve={props.onUnresolve!}
          onDeleteComment={props.onDeleteComment!}
          onDeleteThread={props.onDeleteThread!}
          currentAuthor={props.currentAuthor!}
          colSpan={4}
          originalCode={props.getOriginalCode?.(thread.side, thread.startLine, thread.endLine)}
          canApply={props.canApply}
          onApplySuggestion={props.onApplySuggestion}
        />
      );
    }
  }

  if (activeLine !== null && props.pendingSelection && props.pendingSelection.endLine === activeLine && props.pendingSelection.side === side && props.filePath && props.currentAuthor && props.onAddThread && props.onCancelPending) {
    result.push(
      <CommentFormRow
        key="pending-comment"
        colSpan={4}
        filePath={props.filePath}
        side={props.pendingSelection.side}
        startLine={props.pendingSelection.startLine}
        endLine={props.pendingSelection.endLine}
        currentAuthor={props.currentAuthor}
        onSubmit={props.onAddThread}
        onCancel={props.onCancelPending}
        originalCode={props.getOriginalCode?.(props.pendingSelection.side, props.pendingSelection.startLine, props.pendingSelection.endLine)}
      />
    );
  }

  return result;
}

export function HunkBlock(props: HunkBlockProps) {
  const {
    hunk, syntaxMap, expandControls, topExpansionLines, bottomExpansionLines, expansionSyntaxMap,
    threads, pendingSelection, currentAuthor, isLineSelected,
    onLineMouseDown, onLineMouseEnter, onCommentClick,
    onAddThread, onReply, onResolve, onUnresolve, onDeleteComment, onDeleteThread,
    onCancelPending, filePath, onRevertChange, getOriginalCode, canApply, onApplySuggestion,
  } = props;

  const commentProps = {
    isLineSelected, onLineMouseDown, onLineMouseEnter, onCommentClick,
    threads, pendingSelection, currentAuthor,
    onAddThread, onReply, onResolve, onUnresolve, onDeleteComment, onDeleteThread,
    onCancelPending, filePath, getOriginalCode, canApply, onApplySuggestion,
  };

  const changeGroupEnds = useMemo(() => {
    if (!onRevertChange) {
      return new Map<number, { startIndex: number; endIndex: number }>();
    }
    const groups = getChangeGroups(hunk.lines);
    const map = new Map<number, { startIndex: number; endIndex: number }>();
    for (const group of groups) {
      map.set(group.endIndex, group);
    }
    return map;
  }, [hunk.lines, onRevertChange]);

  const rows: React.ReactNode[] = [];

  if (topExpansionLines) {
    for (let i = 0; i < topExpansionLines.length; i++) {
      rows.push(...renderLineWithComments(topExpansionLines[i], i, true, expansionSyntaxMap, commentProps));
    }
  }

  if (bottomExpansionLines) {
    for (let i = 0; i < bottomExpansionLines.length; i++) {
      rows.push(...renderLineWithComments(bottomExpansionLines[i], i, true, expansionSyntaxMap, commentProps));
    }
  }

  for (let i = 0; i < hunk.lines.length; i++) {
    const group = changeGroupEnds.get(i);
    const onUndo = group ? () => onRevertChange!(hunk, group.startIndex, group.endIndex) : undefined;
    rows.push(...renderLineWithComments(hunk.lines[i], i, false, syntaxMap, commentProps, onUndo));
  }

  return (
    <tbody className={expandControls?.wasExpanded && expandControls.remainingLines <= 0 ? '' : 'border-t border-border-muted'}>
      <HunkHeader hunk={hunk} expandControls={expandControls} />
      {rows}
    </tbody>
  );
}
