import type { DiffFile } from '@diffity/parser';

export type ViewMode = 'unified' | 'split';

export function getFilePath(file: DiffFile): string {
  if (file.status === 'deleted') {
    return file.oldPath;
  }
  return file.newPath;
}

export function getLineBg(type: string): string {
  switch (type) {
    case 'add':
      return 'bg-diff-add-bg';
    case 'delete':
      return 'bg-diff-del-bg';
    default:
      return 'bg-bg';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'added':
      return 'bg-added/15 text-added';
    case 'deleted':
      return 'bg-deleted/15 text-deleted';
    case 'renamed':
      return 'bg-renamed/15 text-renamed';
    default:
      return 'bg-modified/15 text-modified';
  }
}
