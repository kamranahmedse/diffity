import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const cliPkgPath = resolve(root, 'packages/cli/package.json');
const lockPath = resolve(root, 'package-lock.json');

const bump = process.argv[2] as 'patch' | 'minor';
if (bump !== 'patch' && bump !== 'minor') {
  console.error('Usage: tsx scripts/release.ts <patch|minor>');
  process.exit(1);
}

const cliPkg = JSON.parse(readFileSync(cliPkgPath, 'utf-8'));
const [major, minor, patch] = cliPkg.version.split('.').map(Number);

const newVersion =
  bump === 'minor'
    ? `${major}.${minor + 1}.0`
    : `${major}.${minor}.${patch + 1}`;

console.log(`${cliPkg.version} → ${newVersion}\n`);

cliPkg.version = newVersion;
writeFileSync(cliPkgPath, JSON.stringify(cliPkg, null, 2) + '\n');

const lockJson = JSON.parse(readFileSync(lockPath, 'utf-8'));
if (lockJson.packages?.['packages/cli']) {
  lockJson.packages['packages/cli'].version = newVersion;
  writeFileSync(lockPath, JSON.stringify(lockJson, null, 2) + '\n');
}

execSync('git add packages/cli/package.json package-lock.json', { cwd: root, stdio: 'inherit' });
execSync(`git commit -m "chore: release v${newVersion}"`, { cwd: root, stdio: 'inherit' });
execSync(`git tag v${newVersion}`, { cwd: root, stdio: 'inherit' });

console.log(`\nTagged v${newVersion}`);
