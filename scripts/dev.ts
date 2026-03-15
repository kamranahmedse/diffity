#!/usr/bin/env node

import { execSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import concurrently from 'concurrently';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

execSync('tsx scripts/link-dev.ts && npm run build:skills', {
  cwd: rootDir,
  stdio: 'inherit',
});

concurrently(
  [
    { command: 'npm run dev -w @diffity/parser', name: 'parser' },
    { command: 'npm run dev -w @diffity/git', name: 'git' },
    { command: 'npm run dev:watch -w diffity', name: 'cli' },
    // `vite build --watch` instead of `vite dev` so the output lands in dist/ui
    // where the CLI server can serve it. `vite dev` only serves from memory.
    { command: 'npx -w @diffity/ui vite build --watch', name: 'ui' },
    {
      command: 'tsx --watch-path=packages/skills scripts/build-skills.ts',
      name: 'skills',
    },
  ],
  {
    prefixColors: ['blue', 'green', 'yellow', 'magenta', 'cyan'],
  }
);
