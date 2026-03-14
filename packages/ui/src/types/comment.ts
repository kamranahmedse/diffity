export interface CommentAuthor {
  name: string;
  avatarUrl?: string;
  type: 'user' | 'agent';
}

export interface Comment {
  id: string;
  author: CommentAuthor;
  body: string;
  createdAt: string;
}

export type CommentSide = 'old' | 'new';

export interface CommentThread {
  id: string;
  filePath: string;
  side: CommentSide;
  startLine: number;
  endLine: number;
  comments: Comment[];
  isResolved: boolean;
}

export interface LineSelection {
  filePath: string;
  side: CommentSide;
  startLine: number;
  endLine: number;
}
