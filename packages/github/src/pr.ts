import { execSync } from 'node:child_process';
import { exec } from './exec.js';
import type { PrComment, PushResult, PulledComment } from './types.js';

export function getFiles(owner: string, repo: string, prNumber: number): Set<string> {
  try {
    const raw = exec(
      `gh api repos/${owner}/${repo}/pulls/${prNumber}/files --jq '.[].filename'`,
    );
    return new Set(raw.split('\n').filter(Boolean));
  } catch {
    return new Set();
  }
}

interface ExistingComment {
  path: string;
  line: number;
  side: string;
  body: string;
}

export function getComments(owner: string, repo: string, prNumber: number): ExistingComment[] {
  try {
    const json = execSync(
      `gh api repos/${owner}/${repo}/pulls/${prNumber}/comments --paginate`,
      { encoding: 'utf-8', stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 },
    ).trim();
    if (!json) {
      return [];
    }
    const data = JSON.parse(json);
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map((c: { path: string; line: number; side: string; body: string }) => ({
      path: c.path,
      line: c.line,
      side: c.side,
      body: c.body,
    }));
  } catch {
    return [];
  }
}

export function getCommentCount(owner: string, repo: string, prNumber: number): number {
  return getComments(owner, repo, prNumber).length;
}

interface GitHubCommentRaw {
  path: string;
  line: number;
  start_line: number | null;
  side: string;
  body: string;
  user: { login: string; type: string };
  created_at: string;
}

export function pullComments(owner: string, repo: string, prNumber: number): PulledComment[] {
  try {
    const json = execSync(
      `gh api repos/${owner}/${repo}/pulls/${prNumber}/comments --paginate`,
      { encoding: 'utf-8', stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 },
    ).trim();
    if (!json) {
      return [];
    }
    const data = JSON.parse(json) as GitHubCommentRaw[];
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .filter(c => c.line !== null)
      .map(c => ({
        filePath: c.path,
        side: c.side === 'LEFT' ? 'old' as const : 'new' as const,
        startLine: c.start_line ?? c.line,
        endLine: c.line,
        body: c.body,
        authorName: c.user.login,
        authorType: c.user.type === 'Bot' ? 'agent' as const : 'user' as const,
        createdAt: c.created_at,
      }));
  } catch {
    return [];
  }
}

function isDuplicate(existing: ExistingComment[], comment: PrComment): boolean {
  return existing.some(e =>
    e.path === comment.filePath &&
    e.line === comment.endLine &&
    e.side === comment.side &&
    e.body === comment.body,
  );
}

export function pushComments(
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  comments: PrComment[],
): PushResult {
  const prFiles = getFiles(owner, repo, prNumber);
  const existing = getComments(owner, repo, prNumber);

  let pushed = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const comment of comments) {
    if (!prFiles.has(comment.filePath)) {
      failed++;
      errors.push(`${comment.filePath} — not in PR diff (push your changes first)`);
      continue;
    }

    if (isDuplicate(existing, comment)) {
      skipped++;
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

  return { pushed, skipped, failed, errors };
}
