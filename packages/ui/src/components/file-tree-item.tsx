import type { TreeNode } from '../lib/file-tree';
import { cn } from '../lib/cn';
import { DiffStats } from './diff-stats';
import { StatusBadge } from './ui/status-badge';
import { ChevronIcon } from './icons/chevron-icon';
import { FolderIcon } from './icons/folder-icon';
import { FileIcon } from './icons/file-icon';
import { CommentIcon } from './icons/comment-icon';

interface FileTreeItemProps {
  node: TreeNode;
  depth: number;
  activeFile: string | null;
  reviewedFiles: Set<string>;
  filesWithComments: Set<string>;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  onFileClick: (path: string) => void;
}

export function FileTreeItem(props: FileTreeItemProps) {
  const { node, depth, activeFile, reviewedFiles, filesWithComments, expandedDirs, onToggleDir, onFileClick } = props;
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
            filesWithComments={filesWithComments}
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
  const hasComments = filesWithComments.has(node.path);

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
      {hasComments && (
        <CommentIcon className="w-3.5 h-3.5 text-accent shrink-0" />
      )}
      {isReviewed ? (
        <span className="text-added text-xs shrink-0" title="Viewed">&#10003;</span>
      ) : (
        <DiffStats additions={node.file.additions} deletions={node.file.deletions} />
      )}
    </button>
  );
}
