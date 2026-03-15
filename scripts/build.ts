#!/usr/bin/env node

import { execSync } from 'node:child_process';

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
