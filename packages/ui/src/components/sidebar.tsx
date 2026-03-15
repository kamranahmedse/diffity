import { useState } from 'react';
import type { DiffFile } from '@diffity/parser';
import { FileTree } from './file-tree';

interface SidebarProps {
  files: DiffFile[];
  activeFile: string | null;
  reviewedFiles: Set<string>;
  filesWithComments: Set<string>;
  onFileClick: (path: string) => void;
}

export function Sidebar(props: SidebarProps) {
  const { files, activeFile, reviewedFiles, filesWithComments, onFileClick } = props;
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);

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
            {reviewedFiles.size > 0 ? `${reviewedFiles.size}/${files.length}` : files.length}
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
      <FileTree
        files={files}
        search={search}
        activeFile={activeFile}
        reviewedFiles={reviewedFiles}
        filesWithComments={filesWithComments}
        onFileClick={onFileClick}
      />
    </aside>
  );
}
