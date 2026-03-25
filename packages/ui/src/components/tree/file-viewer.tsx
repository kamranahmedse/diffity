import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useHighlighter } from '../../hooks/use-highlighter';
import { useLineSelection } from '../../hooks/use-line-selection';
import type { CommentThread as CommentThreadType, CommentAuthor, LineSelection } from '../comments/types';
import type { CommentActions } from '../../hooks/use-comment-actions';
import { CommentThread } from '../comments/comment-thread';
import { CommentForm } from '../comments/comment-form';
import { CommentLineNumber } from '../comments/comment-line-number';
import { cn } from '../../lib/cn';

interface TourHighlight {
  filePath: string;
  startLine: number;
  endLine: number;
  annotation: string;
  scrollTick: number;
}

interface FileViewerProps {
  filePath: string;
  content: string[];
  theme: 'light' | 'dark';
  threads: CommentThreadType[];
  commentActions: CommentActions;
  sessionId: string | null;
  tourHighlight?: TourHighlight | null;
}

const CURRENT_AUTHOR: CommentAuthor = { name: 'You', type: 'user' };

export function FileViewer(props: FileViewerProps) {
  const {
    filePath,
    content,
    theme,
    threads,
    commentActions,
    sessionId,
    tourHighlight,
  } = props;

  const [pendingSelection, setPendingSelection] = useState<LineSelection | null>(null);
  const { highlight, ready } = useHighlighter();
  const tableRef = useRef<HTMLTableElement>(null);

  const activeTourHighlight = tourHighlight && tourHighlight.filePath === filePath ? tourHighlight : null;

  useEffect(() => {
    if (!activeTourHighlight) {
      return;
    }

    const scrollToHighlight = () => {
      if (!tableRef.current) {
        return;
      }
      const scrollParent = tableRef.current.closest('main');
      if (scrollParent) {
        // Reset first so getBoundingClientRect is measured from a clean state
        scrollParent.scrollTop = 0;
      }
      const targetLine = Math.max(1, activeTourHighlight.startLine - 6);
      const row = tableRef.current.querySelector(`tr:nth-child(${targetLine})`);
      if (!row) {
        return;
      }
      if (scrollParent) {
        const rowTop = row.getBoundingClientRect().top;
        const parentTop = scrollParent.getBoundingClientRect().top;
        scrollParent.scrollTop = rowTop - parentTop;
      } else {
        row.scrollIntoView({ block: 'start' });
      }
    };

    // Double rAF: first fires before paint, second fires after
    // the browser has flushed layout with the new file content.
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToHighlight);
    });
  }, [activeTourHighlight]);

  const tokens = useMemo(() => {
    if (!ready) {
      return null;
    }
    return highlight(content.join('\n'), filePath, theme);
  }, [ready, highlight, content, filePath, theme]);

  const onSelectionComplete = useCallback((selection: LineSelection) => {
    setPendingSelection(selection);
  }, []);

  const {
    handleLineMouseDown,
    handleLineMouseEnter,
    isLineInSelection,
  } = useLineSelection({ filePath, onSelectionComplete });

  const fileThreads = useMemo(() => {
    return threads.filter(t => t.filePath === filePath);
  }, [threads, filePath]);

  const threadsByLine = useMemo(() => {
    const map = new Map<number, CommentThreadType[]>();
    for (const thread of fileThreads) {
      const existing = map.get(thread.endLine) ?? [];
      existing.push(thread);
      map.set(thread.endLine, existing);
    }
    return map;
  }, [fileThreads]);

  const isLineSelected = useCallback((lineNum: number) => {
    if (activeTourHighlight && lineNum >= activeTourHighlight.startLine && lineNum <= activeTourHighlight.endLine) {
      return true;
    }
    if (isLineInSelection(lineNum, 'new')) {
      return true;
    }
    if (pendingSelection && pendingSelection.filePath === filePath && pendingSelection.side === 'new') {
      if (lineNum >= pendingSelection.startLine && lineNum <= pendingSelection.endLine) {
        return true;
      }
    }
    for (const thread of fileThreads) {
      if (thread.status === 'open' && lineNum >= thread.startLine && lineNum <= thread.endLine) {
        return true;
      }
    }
    return false;
  }, [isLineInSelection, pendingSelection, filePath, fileThreads, activeTourHighlight]);

  const handleAddThread = useCallback((body: string) => {
    if (!pendingSelection || !sessionId) {
      return;
    }

    const anchorContent = content.slice(
      pendingSelection.startLine - 1,
      pendingSelection.endLine,
    ).join('\n');

    commentActions.addThread(
      filePath,
      'new',
      pendingSelection.startLine,
      pendingSelection.endLine,
      body,
      CURRENT_AUTHOR,
      anchorContent,
    );
    setPendingSelection(null);
  }, [pendingSelection, sessionId, content, filePath, commentActions]);

  const handleCommentClick = useCallback((lineNum: number) => {
    setPendingSelection({
      filePath,
      side: 'new',
      startLine: lineNum,
      endLine: lineNum,
    });
  }, [filePath]);

  const getOriginalCode = useCallback((_side: 'old' | 'new', startLine: number, endLine: number) => {
    return content.slice(startLine - 1, endLine).join('\n');
  }, [content]);

  const rows: React.ReactNode[] = [];
  for (let i = 0; i < content.length; i++) {
    const lineNum = i + 1;
    const lineTokens = tokens?.[i]?.tokens;
    const selected = isLineSelected(lineNum);

    if (activeTourHighlight && activeTourHighlight.annotation && lineNum === activeTourHighlight.startLine) {
      rows.push(
        <tr key="tour-annotation">
          <td colSpan={2} className="px-4 py-1.5">
            <div className="inline-flex items-center px-2 py-1 bg-diff-comment-bg rounded text-[11px] font-medium text-text-secondary">
              {activeTourHighlight.annotation}
            </div>
          </td>
        </tr>
      );
    }

    rows.push(
      <tr
        key={`line-${lineNum}`}
        className="group/row"
      >
        <CommentLineNumber
          lineNumber={lineNum}
          isSelected={selected}
          onMouseDown={() => handleLineMouseDown(lineNum, 'new')}
          onMouseEnter={() => handleLineMouseEnter(lineNum, 'new')}
          onCommentClick={() => handleCommentClick(lineNum)}
          showCommentButton={true}
        />
        <td
          className={cn(
            'px-4 py-0 font-mono text-[13px] leading-6 whitespace-pre',
            selected && 'bg-diff-comment-bg',
          )}
        >
          {lineTokens ? (
            lineTokens.map((token, j) => (
              <span key={j} style={{ color: token.color }}>{token.text}</span>
            ))
          ) : (
            content[i]
          )}
        </td>
      </tr>
    );

    const lineThreads = threadsByLine.get(lineNum);
    if (lineThreads) {
      for (const thread of lineThreads) {
        rows.push(
          <CommentThread
            key={`thread-${thread.id}`}
            thread={thread}
            onReply={commentActions.addReply}
            onResolve={commentActions.resolveThread}
            onUnresolve={commentActions.unresolveThread}
            onEditComment={commentActions.editComment}
            onDeleteComment={commentActions.deleteComment}
            onDeleteThread={commentActions.deleteThread}
            currentAuthor={CURRENT_AUTHOR}
            colSpan={2}
            currentCode={getOriginalCode('new', thread.startLine, thread.endLine)}
          />
        );
      }
    }

    if (pendingSelection && lineNum === pendingSelection.endLine) {
      const lineLabel = pendingSelection.startLine === pendingSelection.endLine
        ? `Line ${pendingSelection.startLine}`
        : `Lines ${pendingSelection.startLine}–${pendingSelection.endLine}`;

      rows.push(
        <tr key="pending-form">
          <td colSpan={2} className="px-4 py-2">
            <div className="max-w-[700px]">
              <CommentForm
                onSubmit={handleAddThread}
                onCancel={() => setPendingSelection(null)}
                lineLabel={lineLabel}
              />
            </div>
          </td>
        </tr>
      );
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-x-auto">
      <table ref={tableRef} className="w-full border-collapse">
        <tbody>
          {rows}
        </tbody>
      </table>
    </div>
  );
}
