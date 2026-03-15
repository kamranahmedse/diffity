import { writeFileSync, readFileSync, chmodSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const binDir = join(rootDir, '.bin');
const cliEntry = join(rootDir, 'packages', 'cli', 'dist', 'index.js');
const watchDir = join(rootDir, 'packages', 'cli', 'dist');
const linkPath = join(binDir, 'diffity-dev');

if (!existsSync(cliEntry)) {
  console.log('CLI not built yet, building packages first...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
}

mkdirSync(binDir, { recursive: true });

if (existsSync(linkPath)) {
  unlinkSync(linkPath);
}

const script = `#!/usr/bin/env bash
exec node --watch-path="${watchDir}" "${cliEntry}" --no-open "$@"
`;

writeFileSync(linkPath, script);
chmodSync(linkPath, 0o755);

const pathIncludes = process.env.PATH?.includes(binDir);
console.log(`Created diffity-dev (auto-restarts on changes)`);
if (!pathIncludes) {
  const profileName = process.env.SHELL?.includes('zsh') ? '.zshrc' : '.bashrc';
  const profilePath = resolve(process.env.HOME || '~', profileName);
  const exportLine = `export PATH="${binDir}:$PATH"`;

  if (existsSync(profilePath)) {
    const content = readFileSync(profilePath, 'utf-8');
    if (!content.includes(binDir)) {
      writeFileSync(profilePath, content + `\n# diffity dev CLI\n${exportLine}\n`);
      console.log(`\nAdded .bin to PATH in ~/${profileName}`);
      console.log(`Run: source ~/${profileName}`);
    }
  } else {
    console.log(`\nAdd this to your shell profile:`);
    console.log(`  ${exportLine}`);
  }
}
