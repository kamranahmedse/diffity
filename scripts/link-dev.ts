import { writeFileSync, chmodSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const binDir = join(rootDir, '.bin');
const cliEntry = join(rootDir, 'packages', 'cli', 'dist', 'index.js');
const watchDir = join(rootDir, 'packages', 'cli', 'dist');
const linkPath = join(binDir, 'diffity-dev');

mkdirSync(binDir, { recursive: true });

if (existsSync(linkPath)) {
  unlinkSync(linkPath);
}

// Shell script instead of a symlink to dist/index.js so we can use node --watch.
// A symlink would run the CLI once and never pick up server-side changes.
// --watch-path: auto-restart when tsc --watch recompiles dist/
// --no-open: prevent opening a new browser tab on every restart
const script = `#!/usr/bin/env bash
exec node --watch-path="${watchDir}" "${cliEntry}" --no-open "$@"
`;

writeFileSync(linkPath, script);
chmodSync(linkPath, 0o755);

const pathIncludes = process.env.PATH?.includes(binDir);
console.log(`Created diffity-dev (auto-restarts on changes)`);
if (!pathIncludes) {
  console.log(`\nAdd this to your shell profile to use diffity-dev globally:`);
  console.log(`  export PATH="${binDir}:$PATH"`);
}
