import { build, context } from 'esbuild';
import { rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');
const isWatch = process.argv.includes('--watch');

// Clean all previous build output except the ui/ directory (built separately by vite)
for (const entry of readdirSync(distDir)) {
  if (entry === 'ui') {
    continue;
  }
  const fullPath = join(distDir, entry);
  const stat = statSync(fullPath);
  rmSync(fullPath, { recursive: stat.isDirectory(), force: true });
}

const buildOptions = {
  entryPoints: [join(__dirname, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: join(distDir, 'index.js'),
  banner: {
    js: '#!/usr/bin/env node',
  },
  external: [
    'better-sqlite3',
    'commander',
    'open',
    'picocolors',
  ],
  sourcemap: isWatch,
  minifySyntax: !isWatch,
  treeShaking: true,
};

if (isWatch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await build(buildOptions);
}
