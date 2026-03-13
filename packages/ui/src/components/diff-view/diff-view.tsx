import { useCallback, useMemo } from 'react';
import type { ParsedDiff } from '@diffity/parser';
import { FileBlock } from '../file-block/file-block.js';
import { useHighlighter } from '../../hooks/use-highlighter.js';
import styles from './diff-view.module.css';

type ViewMode = 'unified' | 'split';

interface DiffViewProps {
  diff: ParsedDiff;
  viewMode: ViewMode;
  theme: 'light' | 'dark';
  onActiveFileChange?: (path: string) => void;
}

export function DiffView(props: DiffViewProps) {
  const { diff, viewMode, theme, onActiveFileChange } = props;
  const { highlight } = useHighlighter();

  const handleVisible = useCallback(
    (path: string) => {
      if (onActiveFileChange) {
        onActiveFileChange(path);
      }
    },
    [onActiveFileChange]
  );

  const highlighters = useMemo(() => {
    const map = new Map<string, (code: string) => ReturnType<typeof highlight>>();
    for (const file of diff.files) {
      const filePath = file.status === 'deleted' ? file.oldPath : file.newPath;
      map.set(filePath, (code: string) => highlight(code, filePath, theme));
    }
    return map;
  }, [diff, highlight, theme]);

  return (
    <div className={styles.container}>
      {diff.files.map((file, i) => {
        const filePath = file.status === 'deleted' ? file.oldPath : file.newPath;
        return (
          <FileBlock
            key={filePath + '-' + i}
            file={file}
            viewMode={viewMode}
            onVisible={handleVisible}
            highlightLine={highlighters.get(filePath)}
          />
        );
      })}
    </div>
  );
}
