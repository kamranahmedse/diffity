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

export function resolveRef(ref: string, extraArgs: string[] = []): string {
  switch (ref) {
    case 'staged': {
      return getDiff(['--staged', ...extraArgs]);
    }
    case 'unstaged': {
      return getDiff(extraArgs);
    }
    case 'working': {
      return getDiff(['HEAD', ...extraArgs]);
    }
    case 'untracked': {
      const files = getUntrackedFiles();
      if (files.length === 0) {
        return '';
      }
      return getUntrackedDiff(files);
    }
    case 'all': {
      let raw = getDiff(['HEAD', ...extraArgs]);
      const untrackedFiles = getUntrackedFiles();
      if (untrackedFiles.length > 0) {
        raw += '\n' + getUntrackedDiff(untrackedFiles);
      }
      return raw;
    }
    default: {
      return getDiff([ref, ...extraArgs]);
    }
  }
}

export function getMergeBase(a: string, b: string): string {
  return exec(`git merge-base ${a} ${b}`);
}

export function getFileContent(path: string, ref = 'HEAD'): string {
  return exec(`git show ${ref}:${path}`);
}
