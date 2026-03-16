import { build } from 'esbuild';
import { rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');

// Clean all previous build output except the ui/ directory (built separately by vite)
for (const entry of readdirSync(distDir)) {
  if (entry === 'ui') {
    continue;
  }
  const fullPath = join(distDir, entry);
  const stat = statSync(fullPath);
  rmSync(fullPath, { recursive: stat.isDirectory(), force: true });
}

await build({
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
  sourcemap: false,
  minifySyntax: true,
  treeShaking: true,
});
