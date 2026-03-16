#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const steps = [
  'npm run build:skills',
  'npm run build -w @diffity/parser',
  'npm run build -w @diffity/git',
  'npm run build -w @diffity/ui',
  'npm run build -w diffity',
];

for (const step of steps) {
  execSync(step, { stdio: 'inherit' });
}

copyFileSync(
  resolve(root, 'README.md'),
  resolve(root, 'packages/cli/README.md'),
);
