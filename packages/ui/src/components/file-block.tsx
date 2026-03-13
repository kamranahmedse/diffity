import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { DiffFile } from '@diffity/parser';
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

interface FileBlockProps {
  file: DiffFile;
  viewMode: ViewMode;
  onVisible?: (path: string) => void;
  highlightLine?: (code: string) => HighlightedTokens[] | null;
}

export function FileBlock(props: FileBlockProps) {
  const { file, viewMode, onVisible, highlightLine } = props;
  const [collapsed, setCollapsed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filePath = getFilePath(file);
  const showRename = file.status === 'renamed' && file.oldPath !== file.newPath;

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

  const handleToggleCollapse = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  const handleCollapseAll = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    setCollapsed(detail.collapsed);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.addEventListener('toggle-collapse', handleToggleCollapse);
    document.addEventListener('collapse-all-files', handleCollapseAll);
    return () => {
      el.removeEventListener('toggle-collapse', handleToggleCollapse);
      document.removeEventListener('collapse-all-files', handleCollapseAll);
    };
  }, [handleToggleCollapse, handleCollapseAll]);

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

  const total = file.additions + file.deletions;
  const addPct = total > 0 ? (file.additions / total) * 100 : 0;

  return (
    <div ref={ref} className="border border-border rounded-lg mx-4 my-4 overflow-hidden" id={`file-${encodeURIComponent(filePath)}`}>
      <div className="flex items-center gap-2 px-3 py-2 bg-bg-secondary border-b border-border text-sm sticky top-0 z-10 shadow-sticky">
        <IconButton
          className="text-[10px] w-5 h-5 shrink-0"
          onClick={() => setCollapsed(!collapsed)}
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
              {file.hunks.map((hunk, i) =>
                viewMode === 'split' ? (
                  <HunkBlockSplit key={i} hunk={hunk} />
                ) : (
                  <HunkBlock key={i} hunk={hunk} syntaxMap={syntaxMap} />
                )
              )}
            </table>
          )}
        </div>
      )}
    </div>
  );
}
