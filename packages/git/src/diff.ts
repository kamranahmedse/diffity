import { exec, execLarge, execLines } from './exec.js';

export function getDiff(args: string[] = []): string {
  const cmd = ['git', 'diff', ...args].join(' ');
  return execLarge(cmd);
}

export function getUntrackedFiles(): string[] {
  return execLines('git ls-files --others --exclude-standard');
}

export function getUntrackedDiff(files: string[]): string {
  const diffs: string[] = [];

  for (const file of files) {
    try {
      execLarge(`git diff --no-index -- /dev/null "${file}"`);
    } catch (err: unknown) {
      const error = err as { stdout?: string; status?: number };
      if (error.status === 1 && error.stdout) {
        diffs.push(error.stdout);
      }
    }
  }

  return diffs.join('\n');
}

export function getFileContent(path: string, ref = 'HEAD'): string {
  return exec(`git show ${ref}:${path}`);
}
