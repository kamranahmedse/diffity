import { exec } from './exec.js';
import type { Commit } from './types.js';

interface CommitQuery {
  count: number;
  skip?: number;
  search?: string;
}

export function getRecentCommits(query: CommitQuery): Commit[] {
  const { count, skip = 0, search } = query;

  const args = [`-n ${count}`, `--skip=${skip}`, '--format="%H|%h|%s|%cr"'];
  if (search) {
    args.push(`--grep=${search}`, '-i');
  }

  const output = exec(`git log ${args.join(' ')}`);

  if (!output) {
    return [];
  }

  return output.split('\n').map((line) => {
    const [hash, shortHash, message, relativeDate] = line.split('|');
    return { hash, shortHash, message, relativeDate };
  });
}
