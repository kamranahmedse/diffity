import type { TreeNode } from '../lib/file-tree.js';
import { cn } from '../lib/cn.js';
import { DiffStats } from './diff-stats.js';
import { StatusBadge } from './ui/status-badge.js';

interface FileTreeItemProps {
  node: TreeNode;
  depth: number;
  activeFile: string | null;
  reviewedFiles: Set<string>;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  onFileClick: (path: string) => void;
}

function ChevronIcon(props: { expanded: boolean }) {
  return (
    <svg
      className={cn(
        'w-3 h-3 shrink-0 text-text-muted transition-transform duration-150',
        props.expanded && 'rotate-90'
      )}
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" />
    </svg>
  );
}

function FolderIcon(props: { open: boolean }) {
  if (props.open) {
    return (
      <svg className="w-4 h-4 shrink-0 text-accent opacity-80" viewBox="0 0 16 16" fill="currentColor">
        <path d="M.513 1.513A1.75 1.75 0 011.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 00.2.1h6.5A1.75 1.75 0 0116 4.75v8.5A1.75 1.75 0 0114.25 15H1.75A1.75 1.75 0 010 13.25V2.75c0-.464.184-.91.513-1.237zM1.75 2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25v-8.5a.25.25 0 00-.25-.25H7.5c-.55 0-1.07-.26-1.4-.7l-.9-1.2a.25.25 0 00-.2-.1h-3.5a.25.25 0 00-.25.25z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 shrink-0 text-accent opacity-80" viewBox="0 0 16 16" fill="currentColor">
      <path d="M1.75 1A1.75 1.75 0 000 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0016 13.25v-8.5A1.75 1.75 0 0014.25 3H7.5a.25.25 0 01-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 text-text-muted" viewBox="0 0 16 16" fill="currentColor">
      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0113.25 16h-9.5A1.75 1.75 0 012 14.25V1.75zm1.75-.25a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 00.25-.25V6h-2.75A1.75 1.75 0 019 4.25V1.5H3.75zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011z" />
    </svg>
  );
}

export function FileTreeItem(props: FileTreeItemProps) {
  const { node, depth, activeFile, reviewedFiles, expandedDirs, onToggleDir, onFileClick } = props;
  const paddingLeft = depth * 12 + 8;

  if (node.type === 'dir') {
    const isExpanded = expandedDirs.has(node.path);
    return (
      <>
        <button
          className="flex items-center gap-1.5 w-full py-0.5 pr-2 text-left text-sm hover:bg-hover cursor-pointer"
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => onToggleDir(node.path)}
        >
          <ChevronIcon expanded={isExpanded} />
          <FolderIcon open={isExpanded} />
          <span className="truncate font-medium text-text-secondary">{node.name}</span>
        </button>
        {isExpanded && node.children.map(child => (
          <FileTreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            activeFile={activeFile}
            reviewedFiles={reviewedFiles}
            expandedDirs={expandedDirs}
            onToggleDir={onToggleDir}
            onFileClick={onFileClick}
          />
        ))}
      </>
    );
  }

  const isActive = activeFile === node.path;
  const isReviewed = reviewedFiles.has(node.path);

  return (
    <button
      className={cn(
        'flex items-center gap-1.5 w-full py-0.5 pr-2 text-left text-sm cursor-pointer border-l-2',
        isActive
          ? 'bg-active border-l-accent'
          : 'border-l-transparent hover:bg-hover',
        isReviewed && 'opacity-60'
      )}
      style={{ paddingLeft: `${paddingLeft + 15}px` }}
      onClick={() => onFileClick(node.path)}
    >
      <FileIcon />
      <StatusBadge status={node.file.status} compact />
      <span className={cn('flex-1 min-w-0 truncate', isReviewed && 'line-through')}>
        {node.name}
      </span>
      {isReviewed ? (
        <span className="text-added text-xs shrink-0" title="Viewed">&#10003;</span>
      ) : (
        <DiffStats additions={node.file.additions} deletions={node.file.deletions} />
      )}
    </button>
  );
}
