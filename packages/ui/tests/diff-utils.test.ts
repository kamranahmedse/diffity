import { describe, it, expect } from 'vitest';
import type { DiffFile } from '@diffity/parser';
import { getAutoCollapsedPaths } from '../src/lib/diff-utils.js';

function makeFile(path: string, status: DiffFile['status'] = 'modified'): DiffFile {
  return {
    oldPath: status === 'added' ? '' : path,
    newPath: status === 'deleted' ? '' : path,
    status,
    additions: 1,
    deletions: 0,
    hunks: [],
  };
}

describe('getAutoCollapsedPaths', () => {
  it('collapses deleted files', () => {
    const files = [makeFile('src/old.ts', 'deleted'), makeFile('src/new.ts')];
    const collapsed = getAutoCollapsedPaths(files);

    expect(collapsed.has('src/old.ts')).toBe(true);
    expect(collapsed.has('src/new.ts')).toBe(false);
  });

  describe('lock files', () => {
    const lockFiles = [
      'package-lock.json',
      'pnpm-lock.yaml',
      'pnpm-lock.yml',
      'bun.lock',
      'bun.lockb',
      'yarn.lock',
      'Cargo.lock',
      'Gemfile.lock',
      'composer.lock',
      'poetry.lock',
      'Pipfile.lock',
      'go.sum',
      'pubspec.lock',
      'Podfile.lock',
    ];

    for (const name of lockFiles) {
      it(`collapses ${name}`, () => {
        const files = [makeFile(name)];
        const collapsed = getAutoCollapsedPaths(files);

        expect(collapsed.has(name)).toBe(true);
      });
    }

    it('collapses lock files in subdirectories', () => {
      const files = [makeFile('packages/app/package-lock.json')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.has('packages/app/package-lock.json')).toBe(true);
    });
  });

  describe('minified files', () => {
    it('collapses .min.js files', () => {
      const files = [makeFile('dist/app.min.js')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.has('dist/app.min.js')).toBe(true);
    });

    it('collapses .min.css files', () => {
      const files = [makeFile('styles/main.min.css')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.has('styles/main.min.css')).toBe(true);
    });

    it('does not collapse regular .js files', () => {
      const files = [makeFile('src/app.js')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.size).toBe(0);
    });
  });

  describe('generated files', () => {
    it('collapses .d.ts files', () => {
      const files = [makeFile('types/index.d.ts')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.has('types/index.d.ts')).toBe(true);
    });

    it('collapses .map files', () => {
      const files = [makeFile('dist/app.js.map')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.has('dist/app.js.map')).toBe(true);
    });

    it('collapses .snap files', () => {
      const files = [makeFile('tests/__snapshots__/app.test.snap')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.has('tests/__snapshots__/app.test.snap')).toBe(true);
    });

    it('collapses files in dist/', () => {
      const files = [makeFile('dist/index.js')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.has('dist/index.js')).toBe(true);
    });

    it('collapses files in build/', () => {
      const files = [makeFile('build/output.js')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.has('build/output.js')).toBe(true);
    });

    it('collapses .generated.ts files', () => {
      const files = [makeFile('src/api.generated.ts')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.has('src/api.generated.ts')).toBe(true);
    });

    it('collapses protobuf generated files', () => {
      const files = [makeFile('proto/message.pb.go')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.has('proto/message.pb.go')).toBe(true);
    });

    it('collapses .lock extension files', () => {
      const files = [makeFile('some-tool.lock')];
      const collapsed = getAutoCollapsedPaths(files);

      expect(collapsed.has('some-tool.lock')).toBe(true);
    });
  });

  it('does not collapse regular source files', () => {
    const files = [
      makeFile('src/app.tsx'),
      makeFile('lib/utils.ts'),
      makeFile('README.md'),
      makeFile('package.json'),
    ];
    const collapsed = getAutoCollapsedPaths(files);

    expect(collapsed.size).toBe(0);
  });

  it('handles mix of collapsible and non-collapsible files', () => {
    const files = [
      makeFile('src/app.tsx'),
      makeFile('package-lock.json'),
      makeFile('dist/bundle.min.js'),
      makeFile('src/old.ts', 'deleted'),
      makeFile('lib/utils.ts'),
    ];
    const collapsed = getAutoCollapsedPaths(files);

    expect(collapsed.size).toBe(3);
    expect(collapsed.has('src/app.tsx')).toBe(false);
    expect(collapsed.has('package-lock.json')).toBe(true);
    expect(collapsed.has('dist/bundle.min.js')).toBe(true);
    expect(collapsed.has('src/old.ts')).toBe(true);
    expect(collapsed.has('lib/utils.ts')).toBe(false);
  });
});
