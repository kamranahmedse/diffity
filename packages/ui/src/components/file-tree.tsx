import { useMemo, useState, useCallback, useEffect } from 'react';
import type { DiffFile } from '@diffity/parser';
import {
  buildFileTree,
  collapseSingleChildDirs,
  sortTree,
  filterTree,
  collectAllDirPaths,
  type TreeNode,
} from '../lib/file-tree.js';
import { FileTreeItem } from './file-tree-item.js';

interface FileTreeProps {
  files: DiffFile[];
  search: string;
  activeFile: string | null;
  reviewedFiles: Set<string>;
  onFileClick: (path: string) => void;
}

export function FileTree(props: FileTreeProps) {
  const { files, search, activeFile, reviewedFiles, onFileClick } = props;

  const tree = useMemo(() => {
    return sortTree(collapseSingleChildDirs(buildFileTree(files)));
  }, [files]);

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedDirs(new Set(collectAllDirPaths(tree)));
  }, [tree]);

  const displayTree = useMemo(() => {
    if (!search) {
      return tree;
    }
    return filterTree(tree, search);
  }, [tree, search]);

  const handleToggleDir = useCallback((path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {displayTree.map(node => (
        <FileTreeItem
          key={node.path}
          node={node}
          depth={0}
          activeFile={activeFile}
          reviewedFiles={reviewedFiles}
          expandedDirs={expandedDirs}
          onToggleDir={handleToggleDir}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}
