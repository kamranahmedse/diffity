import type { ParsedDiff } from '@diffity/parser';

export interface RepoInfo {
  name: string;
  branch: string;
  root: string;
  description: string;
}

export async function fetchDiff(hideWhitespace: boolean): Promise<ParsedDiff> {
  const url = hideWhitespace ? '/api/diff?whitespace=hide' : '/api/diff';
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

export async function fetchFileContent(filePath: string): Promise<string[]> {
  const res = await fetch(`/api/file/${encodeURIComponent(filePath)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.content as string[];
}
