import { useState } from 'react';
import type { DiffFile } from '@diffity/parser';
import { FileTree } from './file-tree';
import { SidebarIcon } from './icons/sidebar-icon';
import { SearchIcon } from './icons/search-icon';
import { XIcon } from './icons/x-icon';

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
      <div className="w-10 min-w-10 border-r border-border bg-bg-secondary flex items-start justify-center pt-3">
        <button
          className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-hover cursor-pointer"
          onClick={() => setCollapsed(false)}
          title="Show sidebar"
        >
          <SidebarIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 min-w-72 border-r border-border bg-bg-secondary flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <span className="text-xs font-medium text-text-secondary flex items-center gap-2 uppercase tracking-wider">
          Files
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 bg-bg-tertiary rounded-full text-[10px] font-semibold text-text-muted">
            {reviewedFiles.size > 0 ? `${reviewedFiles.size}/${files.length}` : files.length}
          </span>
        </span>
        <button
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-hover cursor-pointer"
          onClick={() => setCollapsed(true)}
          title="Hide sidebar"
        >
          <SidebarIcon className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="relative px-3 py-2">
        <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
        <input
          className="w-full pl-7 pr-7 py-1.5 border border-border rounded-md bg-bg text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 placeholder:text-text-muted"
          type="text"
          placeholder="Filter files..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button
            className="absolute right-5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer"
            onClick={() => setSearch('')}
          >
            <XIcon className="w-3 h-3" />
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
