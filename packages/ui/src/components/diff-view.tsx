import { useMemo } from 'react';
import type { ParsedDiff } from '@diffity/parser';
import { FileBlock } from './file-block.js';
import { useHighlighter } from '../hooks/use-highlighter.js';
import { type ViewMode, getFilePath } from '../lib/diff-utils.js';

interface DiffViewProps {
  diff: ParsedDiff;
  viewMode: ViewMode;
  theme: 'light' | 'dark';
  collapsedFiles: Set<string>;
  onToggleCollapse: (path: string) => void;
  reviewedFiles: Set<string>;
  onReviewedChange: (path: string, reviewed: boolean) => void;
  onActiveFileChange?: (path: string) => void;
}

export function DiffView(props: DiffViewProps) {
  const { diff, viewMode, theme, collapsedFiles, onToggleCollapse, reviewedFiles, onReviewedChange, onActiveFileChange } = props;
  const { highlight } = useHighlighter();

  const highlighters = useMemo(() => {
    const map = new Map<string, (code: string) => ReturnType<typeof highlight>>();
    for (const file of diff.files) {
      const filePath = getFilePath(file);
      map.set(filePath, (code: string) => highlight(code, filePath, theme));
    }
    return map;
  }, [diff, highlight, theme]);

  return (
    <div className="py-2">
      {diff.files.map((file, i) => {
        const filePath = getFilePath(file);
        return (
          <FileBlock
            key={filePath + '-' + i}
            file={file}
            viewMode={viewMode}
            collapsed={collapsedFiles.has(filePath)}
            onToggleCollapse={onToggleCollapse}
            reviewed={reviewedFiles.has(filePath)}
            onReviewedChange={onReviewedChange}
            onVisible={onActiveFileChange}
            highlightLine={highlighters.get(filePath)}
          />
        );
      })}
    </div>
  );
}
