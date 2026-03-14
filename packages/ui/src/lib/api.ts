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

export async function fetchRepoInfo(): Promise<RepoInfo> {
  const res = await fetch('/api/info');
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

export async function fetchCommits(skip = 0, count = 25): Promise<CommitsPage> {
  const res = await fetch(`/api/commits?skip=${skip}&count=${count}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchFileContent(filePath: string): Promise<string[]> {
  const res = await fetch(`/api/file/${encodeURIComponent(filePath)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.content as string[];
}
