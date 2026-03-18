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

  writeFile('base.txt', 'base content\n');
  git('add .');
  git('commit -m "initial commit"');

  git('checkout -b feature');
  writeFile('feature.txt', 'feature content\n');
  writeFile('base.txt', 'modified base\n');
  git('add .');
  git('commit -m "feature changes"');

  git('checkout main');
  writeFile('master-only.txt', 'master content\n');
  git('add .');
  git('commit -m "master changes"');

  git('checkout feature');

  process.chdir(repoDir);
});

afterAll(() => {
  process.chdir(origCwd);
  rmSync(repoDir, { recursive: true, force: true });
});

describe('getDiffFiles', () => {
  it('returns files changed on the branch vs a base ref', async () => {
    const { getDiffFiles } = await import('../src/diff.js');
    const files = getDiffFiles('main');
    expect(files).toContain('feature.txt');
    expect(files).toContain('base.txt');
    expect(files).not.toContain('master-only.txt');
  });

  it('returns only branch changes even when base has diverged', async () => {
    const { getDiffFiles } = await import('../src/diff.js');
    const files = getDiffFiles('main');
    expect(files.length).toBe(2);
    expect(files).not.toContain('master-only.txt');
  });

  it('returns staged files for staged ref', async () => {
    const { getDiffFiles } = await import('../src/diff.js');
    writeFile('staged-file.txt', 'staged\n');
    git('add staged-file.txt');

    const files = getDiffFiles('staged');
    expect(files).toContain('staged-file.txt');

    git('reset HEAD staged-file.txt');
    execSync(`rm "${join(repoDir, 'staged-file.txt')}"`, { stdio: 'pipe' });
  });

  it('returns unstaged files for unstaged ref', async () => {
    const { getDiffFiles } = await import('../src/diff.js');
    writeFile('base.txt', 'unstaged change\n');

    const files = getDiffFiles('unstaged');
    expect(files).toContain('base.txt');

    git('checkout -- base.txt');
  });

  it('returns working tree files for work ref', async () => {
    const { getDiffFiles } = await import('../src/diff.js');
    writeFile('untracked-file.txt', 'untracked\n');
    writeFile('base.txt', 'modified\n');
    git('add base.txt');

    const files = getDiffFiles('work');
    expect(files).toContain('base.txt');
    expect(files).toContain('untracked-file.txt');

    git('reset HEAD base.txt');
    git('checkout -- base.txt');
    execSync(`rm "${join(repoDir, 'untracked-file.txt')}"`, { stdio: 'pipe' });
  });
});
