import { useState, useRef, useEffect, useMemo } from 'react';
import type { DiffFile } from '@diffity/parser';
import { HunkBlock } from '../hunk-block/hunk-block.js';
import { HunkBlockSplit } from '../hunk-block/hunk-block-split.js';
import type { SyntaxToken } from '../diff-line/diff-line.js';
import type { HighlightedTokens } from '../../hooks/use-highlighter.js';
import styles from './file-block.module.css';

type ViewMode = 'unified' | 'split';

interface FileBlockProps {
  file: DiffFile;
  viewMode: ViewMode;
  onVisible?: (path: string) => void;
  highlightLine?: (code: string) => HighlightedTokens[] | null;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'added':
      return 'Added';
    case 'deleted':
      return 'Deleted';
    case 'renamed':
      return 'Renamed';
    case 'copied':
      return 'Copied';
    default:
      return '';
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'added':
      return styles.statusAdded;
    case 'deleted':
      return styles.statusDeleted;
    case 'renamed':
      return styles.statusRenamed;
    default:
      return '';
  }
}

export function FileBlock(props: FileBlockProps) {
  const { file, viewMode, onVisible, highlightLine } = props;
  const [collapsed, setCollapsed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filePath = file.status === 'deleted' ? file.oldPath : file.newPath;
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
    <div ref={ref} className={styles.block} id={`file-${encodeURIComponent(filePath)}`}>
      <div className={styles.header}>
        <button
          className={styles.chevron}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '\u25b6' : '\u25bc'}
        </button>
        <div className={styles.statsBar}>
          {Array.from({ length: Math.min(5, total) }).map((_, i) => (
            <span
              key={i}
              className={
                i < Math.round((addPct / 100) * Math.min(5, total))
                  ? styles.barAdd
                  : styles.barDel
              }
            />
          ))}
        </div>
        <span className={styles.statsText}>
          {file.additions > 0 && (
            <span className={styles.addCount}>+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className={styles.delCount}>-{file.deletions}</span>
          )}
        </span>
        <span className={styles.path}>
          {showRename ? (
            <>
              <span className={styles.oldPath}>{file.oldPath}</span>
              <span className={styles.arrow}> → </span>
              <span>{file.newPath}</span>
            </>
          ) : (
            filePath
          )}
        </span>
        {file.status !== 'modified' && (
          <span className={`${styles.statusBadge} ${getStatusClass(file.status)}`}>
            {getStatusLabel(file.status)}
          </span>
        )}
        {file.isBinary && (
          <span className={styles.binaryBadge}>Binary</span>
        )}
      </div>
      {!collapsed && (
        <div className={styles.content}>
          {file.isBinary ? (
            <div className={styles.binaryMsg}>Binary file not shown</div>
          ) : file.hunks.length === 0 ? (
            <div className={styles.emptyMsg}>
              {file.oldMode && file.newMode
                ? `File mode changed from ${file.oldMode} to ${file.newMode}`
                : 'No content changes'}
            </div>
          ) : (
            <table className={styles.table}>
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
