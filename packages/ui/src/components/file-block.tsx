import { useState, useRef, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import type { DiffFile, DiffLine as DiffLineType } from '@diffity/parser';
import type { SyntaxToken } from '../lib/syntax-token.js';
import type { HighlightedTokens } from '../hooks/use-highlighter.js';
import { type ViewMode, getFilePath } from '../lib/diff-utils.js';
import { computeGaps, createContextLines, getExpandRange, type ExpandableGap } from '../lib/context-expansion.js';
import { fileContentOptions } from '../queries/file.js';
import { DiffStats } from './diff-stats.js';
import { Badge } from './ui/badge.js';
import { IconButton } from './ui/icon-button.js';
import { StatusBadge } from './ui/status-badge.js';
import { HunkWithGap } from './hunk-with-gap.js';
import { ContextRow } from './context-row.js';
import { ExpandRow } from './expand-row.js';

const LARGE_DIFF_LINE_THRESHOLD = 200;

function getTotalLineCount(file: DiffFile): number {
  let count = 0;
  for (const hunk of file.hunks) {
    count += hunk.lines.length;
  }
  return count;
}

interface FileBlockProps {
  file: DiffFile;
  viewMode: ViewMode;
  collapsed: boolean;
  onToggleCollapse: (path: string) => void;
  reviewed: boolean;
  onReviewedChange: (path: string, reviewed: boolean) => void;
  onVisible?: (path: string) => void;
  highlightLine?: (code: string) => HighlightedTokens[] | null;
}

interface GapExpansion {
  fromTop: number;
  fromBottom: number;
  linesFromTop: DiffLineType[];
  linesFromBottom: DiffLineType[];
}

export function FileBlock(props: FileBlockProps) {
  const { file, viewMode, collapsed, onToggleCollapse, reviewed, onReviewedChange, onVisible, highlightLine } = props;

  const totalLines = getTotalLineCount(file);
  const isLargeDiff = totalLines >= LARGE_DIFF_LINE_THRESHOLD;

  const [largeDiffExpanded, setLargeDiffExpanded] = useState(false);
  const [expansions, setExpansions] = useState<Map<string, GapExpansion>>(new Map());
  const [loadingGap, setLoadingGap] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filePath = getFilePath(file);
  const showRename = file.status === 'renamed' && file.oldPath !== file.newPath;
  const isNewFile = file.status === 'added';

  const queryClient = useQueryClient();
  const fileContentPath = file.oldPath || filePath;
  const [fileLineCount, setFileLineCount] = useState<number | null>(null);

  const { ref: inViewRef } = useInView({
    threshold: 0.1,
    onChange: (inView) => {
      if (inView && onVisible) {
        onVisible(filePath);
      }
    },
  });

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    inViewRef(node);
  }, [inViewRef]);

  const syntaxMap = useMemo(() => {
    if (!highlightLine) {
      return undefined;
    }

    const map = new Map<string, SyntaxToken[]>();

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        const highlighted = highlightLine(line.content);
        if (highlighted && highlighted.length > 0) {
          const num = line.type === 'delete' ? line.oldLineNumber : line.newLineNumber;
          const key = `${line.type}-${num}`;
          map.set(key, highlighted[0].tokens);
        }
      }
    }

    return map;
  }, [file, highlightLine]);

  const gaps = useMemo(() => {
    if (isNewFile) {
      return [];
    }
    return computeGaps(file.hunks, fileLineCount);
  }, [file.hunks, fileLineCount, isNewFile]);

  const gapMap = useMemo(() => {
    const map = new Map<string, ExpandableGap>();
    for (const gap of gaps) {
      map.set(gap.id, gap);
    }
    return map;
  }, [gaps]);

  const handleExpand = useCallback(async (gap: ExpandableGap, direction: 'up' | 'down' | 'all') => {
    setLoadingGap(gap.id);

    const lines = await queryClient.ensureQueryData(
      fileContentOptions(fileContentPath, true)
    );
    if (lines.length > 0 && fileLineCount === null) {
      setFileLineCount(lines.length);
    }

    const scrollContainer = containerRef.current?.closest('main') as HTMLElement | null;
    const fileEl = containerRef.current;
    const anchor = fileEl?.querySelector('tbody:last-of-type tr:first-child') as HTMLElement | null;
    const anchorTop = anchor?.getBoundingClientRect().top ?? 0;

    try {
      setExpansions(prev => {
        const next = new Map(prev);
        const existing = next.get(gap.id) || { fromTop: 0, fromBottom: 0, linesFromTop: [], linesFromBottom: [] };
        const newOffset = gap.newStart - gap.oldStart;
        const range = getExpandRange(gap, direction, existing);

        if (!range) {
          return prev;
        }

        const contextLines = createContextLines(lines, range.oldStart, range.oldEnd, newOffset);

        if (direction === 'all') {
          next.set(gap.id, {
            fromTop: gap.oldEnd - gap.oldStart + 1,
            fromBottom: 0,
            linesFromTop: contextLines,
            linesFromBottom: [],
          });
        } else if (direction === 'down') {
          const newExpansion = {
            ...existing,
            fromTop: existing.fromTop + (range.oldEnd - range.oldStart + 1),
            linesFromTop: [...existing.linesFromTop, ...contextLines],
          };
          next.set(gap.id, newExpansion);
        } else {
          const newExpansion = {
            ...existing,
            fromBottom: existing.fromBottom + (range.oldEnd - range.oldStart + 1),
            linesFromBottom: [...contextLines, ...existing.linesFromBottom],
          };
          next.set(gap.id, newExpansion);
        }

        return next;
      });
    } finally {
      setLoadingGap(null);
      requestAnimationFrame(() => {
        if (scrollContainer && anchor) {
          const newAnchorTop = anchor.getBoundingClientRect().top;
          scrollContainer.scrollTop += newAnchorTop - anchorTop;
        }
      });
    }
  }, [fileContentPath, fileLineCount, queryClient]);

  const getGapRemaining = useCallback((gap: ExpandableGap): { total: number; up: number; down: number } => {
    const expansion = expansions.get(gap.id);
    if (!expansion) {
      return { total: gap.totalLines, up: gap.totalLines, down: gap.totalLines };
    }
    const total = Math.max(0, gap.totalLines - expansion.fromTop - expansion.fromBottom);
    const up = Math.max(0, gap.totalLines - expansion.fromTop);
    const down = Math.max(0, gap.totalLines - expansion.fromBottom);
    return { total, up, down };
  }, [expansions]);

  const getExpandControlsForHunk = useCallback((hunkIndex: number) => {
    let gap: ExpandableGap | undefined;
    let position: 'top' | 'between' = 'between';

    if (hunkIndex === 0) {
      gap = gapMap.get('top');
      position = 'top';
    } else {
      gap = gapMap.get(`between-${hunkIndex - 1}`);
      position = 'between';
    }

    if (!gap) {
      return undefined;
    }

    const remaining = getGapRemaining(gap);
    const wasExpanded = expansions.has(gap.id);

    return {
      position,
      remainingLines: remaining.total,
      remainingUp: remaining.up,
      remainingDown: remaining.down,
      loading: loadingGap === gap.id,
      wasExpanded,
      onExpand: (dir: 'up' | 'down' | 'all') => handleExpand(gap, dir),
    };
  }, [gapMap, getGapRemaining, loadingGap, handleExpand, expansions]);

  const total = file.additions + file.deletions;
  const addBlocks = total > 0 ? Math.round((file.additions / total) * Math.min(5, total)) : 0;
  const delBlocks = total > 0 ? Math.min(5, total) - addBlocks : 0;
  const neutralBlocks = 5 - addBlocks - delBlocks;

  const bottomGap = gapMap.get('bottom');
  const bottomRemaining = bottomGap ? getGapRemaining(bottomGap).total : 0;

  return (
    <div ref={setRefs} className="border border-border rounded-lg mx-4 my-4 overflow-hidden" id={`file-${encodeURIComponent(filePath)}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border-b border-border text-sm sticky top-0 z-10 shadow-sticky">
        <IconButton
          className="text-[10px] w-5 h-5 shrink-0"
          onClick={() => onToggleCollapse(filePath)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '\u25b6' : '\u25bc'}
        </IconButton>
        <span className="font-mono text-sm truncate">
          {showRename ? (
            <>
              <span className="line-through text-text-muted">{file.oldPath}</span>
              <span className="text-text-muted"> → </span>
              <span>{file.newPath}</span>
            </>
          ) : (
            filePath
          )}
        </span>
        {file.status !== 'modified' && <StatusBadge status={file.status} />}
        {file.isBinary && <Badge className="bg-bg-tertiary text-text-muted">Binary</Badge>}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <DiffStats additions={file.additions} deletions={file.deletions} />
            <div className="flex gap-px">
              {Array.from({ length: addBlocks }).map((_, i) => (
                <span key={`a${i}`} className="w-2 h-2 rounded-[1px] bg-added" />
              ))}
              {Array.from({ length: delBlocks }).map((_, i) => (
                <span key={`d${i}`} className="w-2 h-2 rounded-[1px] bg-deleted" />
              ))}
              {Array.from({ length: neutralBlocks }).map((_, i) => (
                <span key={`n${i}`} className="w-2 h-2 rounded-[1px] bg-border" />
              ))}
            </div>
          </div>
          <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none hover:text-text transition-colors">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={() => onReviewedChange(filePath, !reviewed)}
              className="accent-added cursor-pointer"
            />
            Viewed
          </label>
        </div>
      </div>
      {!collapsed && (
        <div>
          {file.isBinary ? (
            <div className="p-4 text-center text-text-muted italic">Binary file not shown</div>
          ) : file.hunks.length === 0 ? (
            <div className="p-4 text-center text-text-muted italic">
              {file.oldMode && file.newMode
                ? `File mode changed from ${file.oldMode} to ${file.newMode}`
                : 'No content changes'}
            </div>
          ) : isLargeDiff && !largeDiffExpanded ? (
            <div className="flex items-center justify-center gap-3 py-6 px-4 text-sm text-text-muted">
              <span>Large diff not rendered — {totalLines} lines</span>
              <button
                className="text-accent hover:underline cursor-pointer font-medium"
                onClick={() => setLargeDiffExpanded(true)}
              >
                Load diff
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse table-fixed">
              {viewMode === 'split' ? (
                <colgroup>
                  <col className="w-12.5" />
                  <col className="w-[calc(50%-50px)]" />
                  <col className="w-12.5" />
                  <col />
                </colgroup>
              ) : (
                <colgroup>
                  <col className="w-12.5" />
                  <col className="w-12.5" />
                  <col className="w-5" />
                  <col />
                </colgroup>
              )}
              {file.hunks.map((hunk, i) => {
                const betweenGap = i > 0 ? gapMap.get(`between-${i - 1}`) : undefined;
                const betweenExpansion = betweenGap ? expansions.get(betweenGap.id) : undefined;
                const topExpansion = i === 0 ? expansions.get('top') : undefined;

                return (
                  <HunkWithGap
                    key={i}
                    hunk={hunk}
                    viewMode={viewMode}
                    syntaxMap={syntaxMap}
                    expandControls={getExpandControlsForHunk(i)}
                    topExpansionLines={i === 0 ? [...(topExpansion?.linesFromTop ?? []), ...(topExpansion?.linesFromBottom ?? [])] : undefined}
                    gapExpansion={betweenExpansion}
                    gapId={betweenGap?.id}
                    highlightLine={highlightLine}
                  />
                );
              })}
              {bottomGap && (
                <tbody>
                  {expansions.get('bottom')?.linesFromTop.map((line) => (
                    <ContextRow key={`bottom-top-${line.oldLineNumber}`} line={line} viewMode={viewMode} highlightLine={highlightLine} />
                  ))}
                  <ExpandRow
                    position="bottom"
                    remainingLines={bottomRemaining}
                    loading={loadingGap === 'bottom'}
                    onExpand={(dir) => handleExpand(bottomGap, dir)}
                  />
                  {expansions.get('bottom')?.linesFromBottom.map((line) => (
                    <ContextRow key={`bottom-bot-${line.oldLineNumber}`} line={line} viewMode={viewMode} highlightLine={highlightLine} />
                  ))}
                </tbody>
              )}
            </table>
          )}
        </div>
      )}
    </div>
  );
}
