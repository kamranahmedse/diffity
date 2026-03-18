import { exec, execSilent } from './exec.js';
import type { GitHubInfo } from './types.js';

export function getRemote(): { owner: string; repo: string } | null {
  try {
    const url = exec('git remote get-url origin');
    const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  } catch {
    return null;
  }
}

export function isCliInstalled(): boolean {
  return execSilent('gh --version');
}

export function isAuthenticated(): boolean {
  return execSilent('gh auth status');
}

export function detect(): GitHubInfo | null {
  const remote = getRemote();
  if (!remote) {
    return null;
  }

  if (!isCliInstalled() || !isAuthenticated()) {
    return { ...remote, prNumber: null, prUrl: null, headSha: null };
  }

  const pr = getPr();
  return {
    ...remote,
    prNumber: pr?.number ?? null,
    prUrl: pr?.url ?? null,
    headSha: pr?.headSha ?? null,
  };
}

function getPr(): { number: number; url: string; headSha: string } | null {
  try {
    const json = exec('gh pr view --json number,url,headRefOid');
    const data = JSON.parse(json);
    if (data.number && data.url && data.headRefOid) {
      return { number: data.number, url: data.url, headSha: data.headRefOid };
    }
    return null;
  } catch {
    return null;
  }
}
