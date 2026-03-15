import { useMemo, useState, useCallback, useRef } from 'react';
import type { DiffFile } from '@diffity/parser';
import {
  buildFileTree,
  collapseSingleChildDirs,
  sortTree,
  filterTree,
  collectAllDirPaths,
} from '../lib/file-tree';
import { FileTreeItem } from './file-tree-item';

interface FileTreeProps {
  files: DiffFile[];
  search: string;
  activeFile: string | null;
  reviewedFiles: Set<string>;
  filesWithComments: Set<string>;
  onFileClick: (path: string) => void;
}

export function FileTree(props: FileTreeProps) {
  const { files, search, activeFile, reviewedFiles, filesWithComments, onFileClick } = props;

  const tree = useMemo(() => {
    return sortTree(collapseSingleChildDirs(buildFileTree(files)));
  }, [files]);

  const prevTreeRef = useRef(tree);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set(collectAllDirPaths(tree)));

  if (prevTreeRef.current !== tree) {
    prevTreeRef.current = tree;
    setExpandedDirs(new Set(collectAllDirPaths(tree)));
  }

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
          filesWithComments={filesWithComments}
          expandedDirs={expandedDirs}
          onToggleDir={handleToggleDir}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
}
