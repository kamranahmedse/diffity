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

export interface LineRenderProps {
  isLineSelected?: (line: number, side: CommentSide) => boolean;
  onLineMouseDown?: (line: number, side: CommentSide) => void;
  onLineMouseEnter?: (line: number, side: CommentSide) => void;
  onCommentClick?: (line: number, side: CommentSide) => void;
  threads?: CommentThread[];
  pendingSelection?: LineSelection | null;
  currentAuthor?: CommentAuthor;
  onAddThread?: (filePath: string, side: CommentSide, startLine: number, endLine: number, body: string, author: CommentAuthor) => void;
  onCancelPending?: () => void;
  filePath?: string;
  onReply?: (threadId: string, body: string, author: CommentAuthor) => void;
  onResolve?: (threadId: string) => void;
  onUnresolve?: (threadId: string) => void;
  onDeleteComment?: (threadId: string, commentId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  getOriginalCode?: (side: CommentSide, startLine: number, endLine: number) => string;
  canApply?: boolean;
  onApplySuggestion?: (filePath: string, startLine: number, endLine: number, newContent: string) => void;
}
