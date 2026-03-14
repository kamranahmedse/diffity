import { useMemo, useRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ParsedDiff } from '@diffity/parser';
import { FileBlock, LARGE_DIFF_LINE_THRESHOLD } from './file-block.js';
import { useHighlighter } from '../hooks/use-highlighter.js';
import { type ViewMode, getFilePath } from '../lib/diff-utils.js';

export interface DiffViewHandle {
  scrollToFile: (path: string) => void;
}

const VIRTUALIZER_OVERSCAN = 3;
const FILE_HEADER_HEIGHT = 56;
const EMPTY_CONTENT_HEIGHT = 100;
const LINE_HEIGHT = 24;
const HUNK_HEADER_HEIGHT = 32;
const FILE_BLOCK_PADDING = 16;

interface DiffViewProps {
  diff: ParsedDiff;
  viewMode: ViewMode;
  theme: 'light' | 'dark';
  collapsedFiles: Set<string>;
  onToggleCollapse: (path: string) => void;
  reviewedFiles: Set<string>;
  onReviewedChange: (path: string, reviewed: boolean) => void;
  onActiveFileChange?: (path: string) => void;
  scrollRef?: React.RefCallback<HTMLElement>;
  handle?: React.Ref<DiffViewHandle>;
  baseRef?: string;
}

function estimateFileHeight(file: { hunks: { lines: { length: number } }[]; isBinary: boolean }, collapsed: boolean): number {
  if (collapsed) {
    return FILE_HEADER_HEIGHT;
  }
  if (file.isBinary || file.hunks.length === 0) {
    return EMPTY_CONTENT_HEIGHT;
  }
  let lineCount = 0;
  for (const hunk of file.hunks) {
    lineCount += hunk.lines.length;
  }
  if (lineCount >= LARGE_DIFF_LINE_THRESHOLD) {
    return EMPTY_CONTENT_HEIGHT;
  }
  return FILE_HEADER_HEIGHT + lineCount * LINE_HEIGHT + file.hunks.length * HUNK_HEADER_HEIGHT + FILE_BLOCK_PADDING;
}

export function DiffView(props: DiffViewProps) {
  const { diff, viewMode, theme, collapsedFiles, onToggleCollapse, reviewedFiles, onReviewedChange, onActiveFileChange, scrollRef, handle, baseRef } = props;
  const { highlight } = useHighlighter();
  const scrollElementRef = useRef<HTMLElement>(null);

  const highlighters = useMemo(() => {
    const map = new Map<string, (code: string) => ReturnType<typeof highlight>>();
    for (const file of diff.files) {
      const filePath = getFilePath(file);
      map.set(filePath, (code: string) => highlight(code, filePath, theme));
    }
    return map;
  }, [diff, highlight, theme]);

  const virtualizer = useVirtualizer({
    count: diff.files.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: (index) => estimateFileHeight(diff.files[index], collapsedFiles.has(getFilePath(diff.files[index]))),
    overscan: VIRTUALIZER_OVERSCAN,
  });

  useImperativeHandle(handle, () => ({
    scrollToFile: (path: string) => {
      const index = diff.files.findIndex((f) => getFilePath(f) === path);
      if (index >= 0) {
        virtualizer.scrollToIndex(index, { align: 'start' });
      }
    },
  }), [diff.files, virtualizer]);

  return (
    <main
      ref={(node) => {
        scrollElementRef.current = node;
        if (scrollRef) {
          scrollRef(node);
        }
      }}
      className="flex-1 overflow-y-auto pb-12"
    >
      <div className="py-2" style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const file = diff.files[virtualItem.index];
          const filePath = getFilePath(file);
          return (
            <div
              key={filePath + '-' + virtualItem.index}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <FileBlock
                file={file}
                viewMode={viewMode}
                collapsed={collapsedFiles.has(filePath)}
                onToggleCollapse={onToggleCollapse}
                reviewed={reviewedFiles.has(filePath)}
                onReviewedChange={onReviewedChange}
                onVisible={onActiveFileChange}
                highlightLine={highlighters.get(filePath)}
                baseRef={baseRef}
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
