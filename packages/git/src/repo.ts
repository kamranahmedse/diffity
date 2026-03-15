import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { exec } from './exec.js';
import type { RepoInfo } from './types.js';

export function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function getRepoRoot(): string {
  return exec('git rev-parse --show-toplevel');
}

export function getRepoName(): string {
  const root = getRepoRoot();
  return root.split('/').pop() || root;
}

export function getCurrentBranch(): string {
  try {
    return exec('git rev-parse --abbrev-ref HEAD');
  } catch {
    return 'HEAD';
  }
}

export function getRepoInfo(): RepoInfo {
  return {
    name: getRepoName(),
    branch: getCurrentBranch(),
    root: getRepoRoot(),
  };
}

export function getHeadHash(): string {
  return exec('git rev-parse HEAD');
}

export function getDiffityDirPath(): string {
  const repoRoot = getRepoRoot();
  const hash = createHash('sha256').update(repoRoot).digest('hex').slice(0, 12);
  return join(homedir(), '.diffity', hash);
}

export function getDiffityDir(): string {
  const dir = getDiffityDirPath();
  mkdirSync(dir, { recursive: true });
  return dir;
}

const ACTIONABLE_REFS = new Set(['work', 'staged', 'unstaged', 'working', 'untracked']);

export function isActionableRef(ref?: string): boolean {
  return !!ref && ACTIONABLE_REFS.has(ref);
}
