import { useCallback } from 'react';
import type { ParsedDiff } from '@diffity/parser';
import { FileBlock } from '../file-block/file-block.js';
import styles from './diff-view.module.css';

type ViewMode = 'unified' | 'split';

interface DiffViewProps {
  diff: ParsedDiff;
  viewMode: ViewMode;
  onActiveFileChange?: (path: string) => void;
}

export function DiffView(props: DiffViewProps) {
  const { diff, viewMode, onActiveFileChange } = props;

  const handleVisible = useCallback(
    (path: string) => {
      if (onActiveFileChange) {
        onActiveFileChange(path);
      }
    },
    [onActiveFileChange]
  );

  return (
    <div className={styles.container}>
      {diff.files.map((file, i) => (
        <FileBlock
          key={file.newPath + '-' + i}
          file={file}
          viewMode={viewMode}
          onVisible={handleVisible}
        />
      ))}
    </div>
  );
}
