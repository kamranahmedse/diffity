#!/usr/bin/env node

import concurrently from 'concurrently';

concurrently(
  [
    { command: 'npm run dev -w @diffity/parser', name: 'parser' },
    { command: 'npm run dev -w @diffity/git', name: 'git' },
    { command: 'npm run dev:watch -w diffity', name: 'cli' },
    { command: 'npm run dev -w @diffity/ui', name: 'ui' },
    {
      command: 'tsx --watch-path=packages/skills scripts/build-skills.ts',
      name: 'skills',
    },
  ],
  {
    prefixColors: ['blue', 'green', 'yellow', 'magenta', 'cyan'],
  }
);
