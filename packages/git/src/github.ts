import { execSync } from 'node:child_process';
import { exec } from './exec.js';

export interface GitHubInfo {
  owner: string;
  repo: string;
  prNumber: number | null;
  prUrl: string | null;
  headSha: string | null;
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

export function getGitHubPr(): { number: number; url: string; headSha: string } | null {
  try {
    const json = execSync('gh pr view --json number,url,headRefOid', {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
    const data = JSON.parse(json);
    if (data.number && data.url && data.headRefOid) {
      return { number: data.number, url: data.url, headSha: data.headRefOid };
    }
    return null;
  } catch {
    return null;
  }
}

export interface PrComment {
  filePath: string;
  side: 'LEFT' | 'RIGHT';
  startLine: number | null;
  endLine: number;
  body: string;
}

export interface PushResult {
  pushed: number;
  failed: number;
  errors: string[];
}

function getPrFiles(owner: string, repo: string, prNumber: number): Set<string> {
  try {
    const json = execSync(
      `gh api repos/${owner}/${repo}/pulls/${prNumber}/files --jq '.[].filename'`,
      { encoding: 'utf-8', stdio: 'pipe' },
    ).trim();
    return new Set(json.split('\n').filter(Boolean));
  } catch {
    return new Set();
  }
}

export function pushPrComments(
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  comments: PrComment[],
): PushResult {
  const prFiles = getPrFiles(owner, repo, prNumber);

  let pushed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const comment of comments) {
    if (!prFiles.has(comment.filePath)) {
      failed++;
      errors.push(`${comment.filePath} — not in PR diff (push your changes first)`);
      continue;
    }

    try {
      const payload: Record<string, unknown> = {
        body: comment.body,
        commit_id: headSha,
        path: comment.filePath,
        side: comment.side,
        line: comment.endLine,
      };
      if (comment.startLine && comment.startLine !== comment.endLine) {
        payload.start_line = comment.startLine;
        payload.start_side = comment.side;
      }
      execSync(
        `gh api repos/${owner}/${repo}/pulls/${prNumber}/comments --method POST --input -`,
        {
          input: JSON.stringify(payload),
          encoding: 'utf-8',
          stdio: 'pipe',
        },
      );
      pushed++;
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      const ghLine = msg.split('\n').find(l => l.includes('gh:'));
      errors.push(`${comment.filePath}:${comment.endLine} — ${ghLine ? ghLine.trim() : 'GitHub API error'}`);
    }
  }

  return { pushed, failed, errors };
}

export function getGitHubInfo(): GitHubInfo | null {
  const remote = getGitHubRemote();
  if (!remote) {
    return null;
  }

  if (!isGhInstalled() || !isGhAuthenticated()) {
    return { ...remote, prNumber: null, prUrl: null, headSha: null };
  }

  const pr = getGitHubPr();
  return {
    ...remote,
    prNumber: pr?.number ?? null,
    prUrl: pr?.url ?? null,
    headSha: pr?.headSha ?? null,
  };
}
