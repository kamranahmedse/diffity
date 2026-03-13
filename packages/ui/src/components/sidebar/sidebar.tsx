import { useState, useMemo } from 'react';
import type { DiffFile } from '@diffity/parser';
import styles from './sidebar.module.css';

interface SidebarProps {
  files: DiffFile[];
  activeFile: string | null;
  onFileClick: (path: string) => void;
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
      return styles.statusModified;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'added':
      return 'A';
    case 'deleted':
      return 'D';
    case 'renamed':
      return 'R';
    case 'copied':
      return 'C';
    default:
      return 'M';
  }
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

function getDirPath(path: string): string {
  const parts = path.split('/');
  if (parts.length <= 1) {
    return '';
  }
  return parts.slice(0, -1).join('/');
}

export function Sidebar(props: SidebarProps) {
  const { files, activeFile, onFileClick } = props;
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const filteredFiles = useMemo(() => {
    if (!search) {
      return files;
    }
    const lower = search.toLowerCase();
    return files.filter(f => f.newPath.toLowerCase().includes(lower));
  }, [files, search]);

  if (collapsed) {
    return (
      <div className={styles.collapsed}>
        <button
          className={styles.expandBtn}
          onClick={() => setCollapsed(false)}
          title="Show sidebar"
        >
          &rsaquo;
        </button>
      </div>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.title}>
          Files changed
          <span className={styles.badge}>{files.length}</span>
        </span>
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed(true)}
          title="Hide sidebar"
        >
          &lsaquo;
        </button>
      </div>
      <div className={styles.searchWrap}>
        <input
          className={styles.search}
          type="text"
          placeholder="Filter files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            className={styles.clearBtn}
            onClick={() => setSearch('')}
          >
            &times;
          </button>
        )}
      </div>
      <div className={styles.list}>
        {filteredFiles.map(file => {
          const path = file.status === 'deleted' ? file.oldPath : file.newPath;
          const isActive = activeFile === path;
          return (
            <button
              key={path}
              className={`${styles.item} ${isActive ? styles.active : ''}`}
              onClick={() => onFileClick(path)}
            >
              <span className={`${styles.status} ${getStatusClass(file.status)}`}>
                {getStatusLabel(file.status)}
              </span>
              <span className={styles.fileInfo}>
                <span className={styles.fileName}>{getFileName(path)}</span>
                {getDirPath(path) && (
                  <span className={styles.dirPath}>{getDirPath(path)}</span>
                )}
              </span>
              <span className={styles.itemStats}>
                {file.additions > 0 && (
                  <span className={styles.itemAdd}>+{file.additions}</span>
                )}
                {file.deletions > 0 && (
                  <span className={styles.itemDel}>-{file.deletions}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
