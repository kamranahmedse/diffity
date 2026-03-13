import { useState, useMemo } from 'react';
import type { DiffFile } from '@diffity/parser';
import { cn } from '../lib/cn.js';
import { getFilePath } from '../lib/diff-utils.js';
import { DiffStats } from './diff-stats.js';
import { StatusBadge } from './ui/status-badge.js';

interface SidebarProps {
  files: DiffFile[];
  activeFile: string | null;
  onFileClick: (path: string) => void;
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
    return files.filter(f => {
      const path = getFilePath(f);
      return path.toLowerCase().includes(lower);
    });
  }, [files, search]);

  if (collapsed) {
    return (
      <div className="w-8 min-w-8 border-r border-border bg-bg-secondary flex items-start justify-center pt-2">
        <button
          className="text-lg p-1 text-text-muted hover:text-text cursor-pointer"
          onClick={() => setCollapsed(false)}
          title="Show sidebar"
        >
          &rsaquo;
        </button>
      </div>
    );
  }

  return (
    <aside className="w-75 min-w-75 border-r border-border bg-bg-secondary flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <span className="font-semibold text-sm flex items-center gap-2">
          Files changed
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 bg-bg-tertiary rounded-full text-xs font-semibold text-text-secondary">
            {files.length}
          </span>
        </span>
        <button
          className="text-lg p-1 text-text-muted hover:text-text cursor-pointer"
          onClick={() => setCollapsed(true)}
          title="Hide sidebar"
        >
          &lsaquo;
        </button>
      </div>
      <div className="relative px-3 py-2">
        <input
          className="w-full px-2 py-1 border border-border rounded-md bg-bg text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          type="text"
          placeholder="Filter files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-base cursor-pointer"
            onClick={() => setSearch('')}
          >
            &times;
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {filteredFiles.map(file => {
          const path = getFilePath(file);
          const isActive = activeFile === path;
          return (
            <button
              key={path}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-1 text-left text-sm transition-colors duration-100 border-l-2 cursor-pointer',
                isActive
                  ? 'bg-active border-l-accent'
                  : 'border-l-transparent hover:bg-hover'
              )}
              onClick={() => onFileClick(path)}
            >
              <StatusBadge status={file.status} compact />
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="truncate">{getFileName(path)}</span>
                {getDirPath(path) && (
                  <span className="text-xs text-text-muted truncate">
                    {getDirPath(path)}
                  </span>
                )}
              </span>
              <DiffStats additions={file.additions} deletions={file.deletions} />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
