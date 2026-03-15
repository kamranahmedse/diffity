import type { ParsedDiff } from '@diffity/parser';
import type { CommentThread, CommentAuthor, CommentSide, Comment } from '../types/comment';

export interface RepoInfo {
  name: string;
  branch: string;
  root: string;
  description: string;
  capabilities?: { reviews: boolean };
  sessionId?: string | null;
}

export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  relativeDate: string;
}

export interface OverviewFile {
  path: string;
  status: 'staged' | 'modified' | 'added';
}

export interface Overview {
  files: OverviewFile[];
}

export interface CommitsPage {
  commits: Commit[];
  hasMore: boolean;
}

export async function fetchDiff(hideWhitespace: boolean, ref?: string): Promise<ParsedDiff> {
  const params = new URLSearchParams();
  if (hideWhitespace) {
    params.set('whitespace', 'hide');
  }
  if (ref) {
    params.set('ref', ref);
  }
  const query = params.toString();
  const url = query ? `/api/diff?${query}` : '/api/diff';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchDiffFingerprint(ref?: string): Promise<string> {
  const params = new URLSearchParams();
  if (ref) {
    params.set('ref', ref);
  }
  const query = params.toString();
  const url = query ? `/api/diff-fingerprint?${query}` : '/api/diff-fingerprint';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.fingerprint;
}

export async function fetchRepoInfo(ref?: string): Promise<RepoInfo> {
  const params = new URLSearchParams();
  if (ref) {
    params.set('ref', ref);
  }
  const query = params.toString();
  const url = query ? `/api/info?${query}` : '/api/info';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchOverview(): Promise<Overview> {
  const res = await fetch('/api/overview');
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchCommits(skip = 0, count = 10, search?: string): Promise<CommitsPage> {
  const params = new URLSearchParams({ skip: String(skip), count: String(count) });
  if (search) {
    params.set('search', search);
  }
  const res = await fetch(`/api/commits?${params}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchSession(): Promise<{ id: string; ref: string; headHash: string } | null> {
  const res = await fetch('/api/sessions/current');
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export async function fetchThreads(sessionId: string, status?: string): Promise<CommentThread[]> {
  const params = new URLSearchParams({ session: sessionId });
  if (status) {
    params.set('status', status);
  }
  const res = await fetch(`/api/threads?${params}`);
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function createThread(data: {
  sessionId: string;
  filePath: string;
  side: CommentSide;
  startLine: number;
  endLine: number;
  body: string;
  author: CommentAuthor;
  anchorContent?: string;
}): Promise<CommentThread> {
  const res = await fetch('/api/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function replyToThread(threadId: string, body: string, author: CommentAuthor): Promise<Comment> {
  const res = await fetch(`/api/threads/${threadId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, author }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function updateThreadStatus(threadId: string, status: string, summary?: string): Promise<void> {
  const res = await fetch(`/api/threads/${threadId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, summary }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function deleteThread(threadId: string): Promise<void> {
  const res = await fetch(`/api/threads/${threadId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function deleteComment(commentId: string): Promise<void> {
  const res = await fetch(`/api/comments/${commentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export async function revertFile(filePath: string, isUntracked: boolean): Promise<void> {
  const res = await fetch('/api/revert-file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, isUntracked }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
}

export async function revertHunk(patch: string): Promise<void> {
  const res = await fetch('/api/revert-hunk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patch }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(json.error || `HTTP ${res.status}`);
  }
}

export async function fetchFileContent(filePath: string, ref?: string): Promise<string[]> {
  const params = new URLSearchParams();
  if (ref) {
    params.set('ref', ref);
  }
  const query = params.toString();
  const url = query
    ? `/api/file/${encodeURIComponent(filePath)}?${query}`
    : `/api/file/${encodeURIComponent(filePath)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.content as string[];
}
