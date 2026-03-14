import { execSync } from 'node:child_process';
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
