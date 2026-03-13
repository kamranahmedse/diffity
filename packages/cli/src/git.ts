import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export function isGitRepo(): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

export function getRepoRoot(): string {
  return execSync('git rev-parse --show-toplevel', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();
}

export function getRepoName(): string {
  const root = getRepoRoot();
  return root.split('/').pop() || root;
}

export function getCurrentBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return 'HEAD';
  }
}

export function getGitDiff(args: string[] = []): string {
  const cmd = ['git', 'diff', ...args].join(' ');
  return execSync(cmd, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 50 * 1024 * 1024,
  });
}

export function getFileContent(path: string, ref?: string): string {
  if (ref) {
    return execSync(`git show ${ref}:${path}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  }

  return execSync(`git show HEAD:${path}`, {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

export interface RepoInfo {
  name: string;
  branch: string;
  root: string;
}

export function getRepoInfo(): RepoInfo {
  return {
    name: getRepoName(),
    branch: getCurrentBranch(),
    root: getRepoRoot(),
  };
}
