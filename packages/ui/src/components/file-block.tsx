import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { DiffFile, DiffLine as DiffLineType } from '@diffity/parser';
import { HunkBlock } from './hunk-block.js';
import { HunkBlockSplit } from './hunk-block-split.js';
import { DiffStats } from './diff-stats.js';
import { Badge } from './ui/badge.js';
import { IconButton } from './ui/icon-button.js';
import { StatusBadge } from './ui/status-badge.js';
import type { SyntaxToken } from './diff-line.js';
import type { HighlightedTokens } from '../hooks/use-highlighter.js';
import { cn } from '../lib/cn.js';
import { type ViewMode, getFilePath } from '../lib/diff-utils.js';
import { computeGaps, createContextLines, getExpandRange, type ExpandableGap } from '../lib/context-expansion.js';
import { ExpandRow } from './hunk-header.js';
import { LineNumberCell } from './line-number-cell.js';

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
  const [fileContent, setFileContent] = useState<string[] | null>(null);
  const [fileLineCount, setFileLineCount] = useState<number | null>(null);
  const [expansions, setExpansions] = useState<Map<string, GapExpansion>>(new Map());
  const [loadingGap, setLoadingGap] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const filePath = getFilePath(file);
  const showRename = file.status === 'renamed' && file.oldPath !== file.newPath;
  const isNewFile = file.status === 'added';

  useEffect(() => {
    if (!ref.current || !onVisible) {
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          onVisible(filePath);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [filePath, onVisible]);

  const syntaxMap = useMemo(() => {
    if (!highlightLine) {
      return undefined;
    }

    const map = new Map<string, SyntaxToken[]>();

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.wordDiff && line.wordDiff.length > 0) {
          continue;
        }
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

  const fetchFileContent = useCallback(async (): Promise<string[] | null> => {
    if (fileContent) {
      return fileContent;
    }

    const res = await fetch(`/api/file/${encodeURIComponent(file.oldPath || filePath)}`);
    if (!res.ok) {
      return null;
    }
    const json = await res.json();
    const lines = json.content as string[];
    setFileContent(lines);
    setFileLineCount(lines.length);
    return lines;
  }, [fileContent, file.oldPath, filePath]);

  useEffect(() => {
    if (isNewFile || file.isBinary || file.hunks.length === 0 || fileLineCount !== null) {
      return;
    }
    fetchFileContent();
  }, [isNewFile, file.isBinary, file.hunks.length, fileLineCount, fetchFileContent]);

  const handleExpand = useCallback(async (gap: ExpandableGap, direction: 'up' | 'down' | 'all') => {
    setLoadingGap(gap.id);

    const scrollContainer = ref.current?.closest('main');
    const scrollTop = scrollContainer?.scrollTop ?? 0;

    try {
      const lines = await fetchFileContent();
      if (!lines) {
        return;
      }

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
          next.set(gap.id, {
            ...existing,
            fromTop: existing.fromTop + (range.oldEnd - range.oldStart + 1),
            linesFromTop: [...existing.linesFromTop, ...contextLines],
          });
        } else {
          next.set(gap.id, {
            ...existing,
            fromBottom: existing.fromBottom + (range.oldEnd - range.oldStart + 1),
            linesFromBottom: [...contextLines, ...existing.linesFromBottom],
          });
        }

        return next;
      });
    } finally {
      setLoadingGap(null);
      requestAnimationFrame(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollTop;
        }
      });
    }
  }, [fetchFileContent]);

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
  const addPct = total > 0 ? (file.additions / total) * 100 : 0;

  const bottomGap = gapMap.get('bottom');
  const bottomRemaining = bottomGap ? getGapRemaining(bottomGap).total : 0;

  return (
    <div ref={ref} className="border border-border rounded-lg mx-4 my-4 overflow-hidden" id={`file-${encodeURIComponent(filePath)}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border-b border-border text-sm sticky top-0 z-10 shadow-sticky">
        <IconButton
          className="text-[10px] w-5 h-5 shrink-0"
          onClick={() => onToggleCollapse(filePath)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '\u25b6' : '\u25bc'}
        </IconButton>
        <div className="flex gap-px shrink-0">
          {Array.from({ length: Math.min(5, total) }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'w-2 h-2 rounded-[1px]',
                i < Math.round((addPct / 100) * Math.min(5, total))
                  ? 'bg-added'
                  : 'bg-deleted'
              )}
            />
          ))}
        </div>
        <DiffStats additions={file.additions} deletions={file.deletions} />
        <span className="font-mono text-sm font-semibold truncate">
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
        <div className="ml-auto flex items-center shrink-0">
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
        <div className="overflow-x-auto">
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

interface HunkWithGapProps {
  hunk: import('@diffity/parser').DiffHunk;
  viewMode: ViewMode;
  syntaxMap?: Map<string, SyntaxToken[]>;
  expandControls?: import('./hunk-header.js').ExpandControls;
  topExpansionLines?: DiffLineType[];
  gapExpansion?: GapExpansion;
  gapId?: string;
  highlightLine?: (code: string) => HighlightedTokens[] | null;
}

function HunkWithGap(props: HunkWithGapProps) {
  const { hunk, viewMode, syntaxMap, expandControls, topExpansionLines, gapExpansion, gapId, highlightLine } = props;

  const HunkComponent = viewMode === 'split' ? HunkBlockSplit : HunkBlock;

  return (
    <>
      {topExpansionLines && topExpansionLines.length > 0 && (
        <tbody>
          {topExpansionLines.map((line) => (
            <ContextRow key={`top-${line.oldLineNumber}`} line={line} viewMode={viewMode} highlightLine={highlightLine} />
          ))}
        </tbody>
      )}
      {gapExpansion && (
        <tbody>
          {gapExpansion.linesFromTop.map((line) => (
            <ContextRow key={`${gapId}-top-${line.oldLineNumber}`} line={line} viewMode={viewMode} highlightLine={highlightLine} />
          ))}
          {gapExpansion.linesFromBottom.map((line) => (
            <ContextRow key={`${gapId}-bot-${line.oldLineNumber}`} line={line} viewMode={viewMode} highlightLine={highlightLine} />
          ))}
        </tbody>
      )}
      <HunkComponent hunk={hunk} syntaxMap={syntaxMap} expandControls={expandControls} />
    </>
  );
}

function ContextRow(props: { line: DiffLineType; viewMode: ViewMode; highlightLine?: (code: string) => HighlightedTokens[] | null }) {
  const { line, viewMode, highlightLine } = props;

  let renderedContent: React.ReactNode = line.content || '\n';
  if (highlightLine && line.content) {
    const highlighted = highlightLine(line.content);
    if (highlighted && highlighted.length > 0) {
      renderedContent = highlighted[0].tokens.map((token: { text: string; color?: string }, i: number) => (
        <span key={i} style={token.color ? { color: token.color } : undefined}>{token.text}</span>
      ));
    }
  }

  if (viewMode === 'split') {
    return (
      <tr className="font-mono text-sm leading-5 bg-diff-expanded-bg">
        <LineNumberCell lineNumber={line.oldLineNumber} className="border-r border-border-muted bg-diff-expanded-gutter" />
        <td className="px-3 whitespace-pre overflow-hidden border-r border-border-muted align-top">
          <span className="inline">{renderedContent}</span>
        </td>
        <LineNumberCell lineNumber={line.newLineNumber} className="border-r border-border-muted bg-diff-expanded-gutter" />
        <td className="px-3 whitespace-pre overflow-hidden border-r border-border-muted align-top">
          <span className="inline">{renderedContent}</span>
        </td>
      </tr>
    );
  }

  return (
    <tr className="font-mono text-sm leading-5 bg-diff-expanded-bg">
      <LineNumberCell lineNumber={line.oldLineNumber} className="border-r border-border-muted bg-diff-expanded-gutter" />
      <LineNumberCell lineNumber={line.newLineNumber} className="border-r border-border-muted bg-diff-expanded-gutter" />
      <td className="w-5 min-w-5 px-1 text-center select-none align-top text-text-muted"> </td>
      <td className="px-3 whitespace-pre overflow-x-auto break-all">
        <span className="inline">{renderedContent}</span>
      </td>
    </tr>
  );
}
