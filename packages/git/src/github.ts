import { execSync } from 'node:child_process';
import { exec } from './exec.js';

export interface GitHubInfo {
  owner: string;
  repo: string;
  prNumber: number | null;
  prUrl: string | null;
}

export function getGitHubRemote(): { owner: string; repo: string } | null {
  try {
    const url = exec('git remote get-url origin');
    const sshMatch = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }
    return null;
  } catch {
    return null;
  }
}

export function isGhInstalled(): boolean {
  try {
    execSync('gh --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function isGhAuthenticated(): boolean {
  try {
    execSync('gh auth status', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function getGitHubPr(): { number: number; url: string } | null {
  try {
    const json = execSync('gh pr view --json number,url', {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
    const data = JSON.parse(json);
    if (data.number && data.url) {
      return { number: data.number, url: data.url };
    }
    return null;
  } catch {
    return null;
  }
}

export function getGitHubInfo(): GitHubInfo | null {
  const remote = getGitHubRemote();
  if (!remote) {
    return null;
  }

  if (!isGhInstalled() || !isGhAuthenticated()) {
    return { ...remote, prNumber: null, prUrl: null };
  }

  const pr = getGitHubPr();
  return {
    ...remote,
    prNumber: pr?.number ?? null,
    prUrl: pr?.url ?? null,
  };
}
