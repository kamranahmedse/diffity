import { exec } from './exec.js';
import type { Commit } from './types.js';

export function getRecentCommits(count: number, skip = 0): Commit[] {
  const output = exec(`git log -n ${count} --skip=${skip} --format="%H|%h|%s|%cr"`);

  if (!output) {
    return [];
  }

  return output.split('\n').map((line) => {
    const [hash, shortHash, message, relativeDate] = line.split('|');
    return { hash, shortHash, message, relativeDate };
  });
}
