import { exec, execLarge, execLines, execWithStdin } from './exec.js';

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
    case '.':
    case 'work': {
      let raw = getDiff(['HEAD', ...extraArgs]);
      const untrackedFiles = getUntrackedFiles();
      if (untrackedFiles.length > 0) {
        raw += '\n' + getUntrackedDiff(untrackedFiles);
      }
      return raw;
    }
    default: {
      return getDiff([normalizeRef(ref), ...extraArgs]);
    }
  }
}

export function revertFile(filePath: string, isUntracked: boolean): void {
  if (isUntracked) {
    exec(`rm "${filePath}"`);
  } else {
    exec(`git checkout HEAD -- "${filePath}"`);
  }
}

export function revertHunk(patch: string): void {
  execWithStdin('git apply --reverse --unidiff-zero', patch);
}

export function getDiffStat(args: string[] = []): string {
  const cmd = ['git', 'diff', '--stat', ...args].join(' ');
  try {
    return execLarge(cmd);
  } catch {
    return '';
  }
}

export function getMergeBase(a: string, b: string): string {
  return exec(`git merge-base ${a} ${b}`);
}

export function normalizeRef(ref: string): string {
  if (ref.includes('...')) {
    return ref;
  }
  const idx = ref.indexOf('..');
  if (idx !== -1) {
    const left = ref.slice(0, idx);
    const right = ref.slice(idx + 2);
    const base = getMergeBase(left, right);
    return `${base}..${right}`;
  }
  return getMergeBase(ref, 'HEAD');
}

export function resolveBaseRef(ref: string): string {
  if (['staged', 'working', 'work', '.', 'unstaged', 'untracked'].includes(ref)) {
    return 'HEAD';
  }

  const threeDotsIdx = ref.indexOf('...');
  if (threeDotsIdx !== -1) {
    const left = ref.slice(0, threeDotsIdx);
    const right = ref.slice(threeDotsIdx + 3);
    return getMergeBase(left, right);
  }

  const twoDotsIdx = ref.indexOf('..');
  if (twoDotsIdx !== -1) {
    const left = ref.slice(0, twoDotsIdx);
    const right = ref.slice(twoDotsIdx + 2);
    return getMergeBase(left, right);
  }

  return getMergeBase(ref, 'HEAD');
}

export function getFileContent(path: string, ref = 'HEAD'): string {
  return exec(`git show ${ref}:${path}`);
}

export function getFileLineCount(path: string, ref = 'HEAD'): number | null {
  try {
    const content = exec(`git show ${ref}:${path}`);
    return content.split('\n').length;
  } catch {
    return null;
  }
}
