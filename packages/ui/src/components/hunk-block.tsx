import type { DiffHunk } from '@diffity/parser';
import type { SyntaxToken } from '../lib/syntax-token.js';
import type { CommentThread as CommentThreadType, CommentAuthor, CommentSide, LineSelection } from '../types/comment.js';
import { DiffLine } from './diff-line.js';
import { HunkHeader, type ExpandControls } from './hunk-header.js';
import { CommentThread } from './comment-thread.js';
import { CommentFormRow } from './comment-form-row.js';

interface HunkBlockProps {
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

export function HunkBlock(props: HunkBlockProps) {
  const {
    hunk, syntaxMap, expandControls, topExpansionRows, bottomExpansionRows,
    threads, pendingSelection, currentAuthor, isLineSelected,
    onLineMouseDown, onLineMouseEnter, onCommentClick,
    onAddThread, onReply, onResolve, onUnresolve, onDeleteComment, onDeleteThread,
    onCancelPending, filePath,
  } = props;

  const rows: React.ReactNode[] = [];

  for (let i = 0; i < hunk.lines.length; i++) {
    const line = hunk.lines[i];
    const num = line.type === 'delete' ? line.oldLineNumber : line.newLineNumber;
    const key = num !== null ? `${line.type}-${num}` : `line-${i}`;
    const tokens = syntaxMap?.get(key);
    const side: CommentSide = line.type === 'delete' ? 'old' : 'new';
    const activeLine = side === 'old' ? line.oldLineNumber : line.newLineNumber;

    rows.push(
      <DiffLine
        key={key}
        line={line}
        syntaxTokens={tokens}
        isSelected={activeLine !== null ? isLineSelected?.(activeLine, side) : false}
        onLineMouseDown={onLineMouseDown}
        onLineMouseEnter={onLineMouseEnter}
        onCommentClick={onCommentClick}
      />
    );

    if (activeLine !== null && threads) {
      const lineThreads = threads.filter(t => t.endLine === activeLine && t.side === side);
      for (const thread of lineThreads) {
        rows.push(
          <CommentThread
            key={`thread-${thread.id}`}
            thread={thread}
            onReply={onReply!}
            onResolve={onResolve!}
            onUnresolve={onUnresolve!}
            onDeleteComment={onDeleteComment!}
            onDeleteThread={onDeleteThread!}
            currentAuthor={currentAuthor!}
            colSpan={4}
          />
        );
      }
    }

    if (activeLine !== null && pendingSelection && pendingSelection.endLine === activeLine && pendingSelection.side === side && filePath && currentAuthor && onAddThread && onCancelPending) {
      rows.push(
        <CommentFormRow
          key="pending-comment"
          colSpan={4}
          filePath={filePath}
          side={pendingSelection.side}
          startLine={pendingSelection.startLine}
          endLine={pendingSelection.endLine}
          currentAuthor={currentAuthor}
          onSubmit={onAddThread}
          onCancel={onCancelPending}
        />
      );
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
