import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let repoDir: string;
let origCwd: string;

function git(cmd: string) {
  execSync(`git ${cmd}`, { cwd: repoDir, stdio: 'pipe' });
}

function writeFile(name: string, content: string) {
  writeFileSync(join(repoDir, name), content);
}

beforeAll(() => {
  origCwd = process.cwd();
  repoDir = mkdtempSync(join(tmpdir(), 'diffity-test-'));

  git('init -b main');
  git('config user.email "test@test.com"');
  git('config user.name "Test"');

  writeFile('alpha.txt', 'alpha\nline');
  writeFile('beta.txt', 'beta\nline\none');
  git('add .');
  git('commit -m "initial commit"');

  process.chdir(repoDir);
});

afterAll(() => {
  process.chdir(origCwd);
  rmSync(repoDir, { recursive: true, force: true });
});

describe('getFileLineCounts', () => {
  it('returns counts for multiple files in a single batch', async () => {
    const { getFileLineCounts } = await import('../src/diff.js');
    const counts = getFileLineCounts(['alpha.txt', 'missing.txt', 'beta.txt']);

    expect(counts.get('alpha.txt')).toBe(2);
    expect(counts.get('beta.txt')).toBe(3);
    expect(counts.has('missing.txt')).toBe(false);
    expect(counts.size).toBe(2);
  });
});
