import type { ParsedDiff } from '@diffity/parser';

export interface RepoInfo {
  name: string;
  branch: string;
  root: string;
  description: string;
  review: string | null;
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

export async function fetchComments(): Promise<unknown[]> {
  const res = await fetch('/api/comments');
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function saveComments(threads: unknown[]): Promise<void> {
  await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(threads),
  });
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

export async function applySuggestion(filePath: string, startLine: number, endLine: number, newContent: string): Promise<void> {
  const res = await fetch('/api/apply-suggestion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath, startLine, endLine, newContent }),
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
