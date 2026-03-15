import { symlinkSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const binDir = join(rootDir, '.bin');
const cliEntry = join(rootDir, 'packages', 'cli', 'dist', 'index.js');
const linkPath = join(binDir, 'diffity-dev');

mkdirSync(binDir, { recursive: true });

if (existsSync(linkPath)) {
  unlinkSync(linkPath);
}

symlinkSync(cliEntry, linkPath);

const pathIncludes = process.env.PATH?.includes(binDir);
console.log(`Linked diffity-dev -> ${cliEntry}`);
if (!pathIncludes) {
  console.log(`\nAdd this to your shell profile to use diffity-dev globally:`);
  console.log(`  export PATH="${binDir}:$PATH"`);
}
