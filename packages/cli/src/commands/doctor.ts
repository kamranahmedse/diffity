import type { Command } from 'commander';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import pc from 'picocolors';
import { isGitRepo } from '@diffity/git';

const require = createRequire(import.meta.url);

export function registerDoctorCommand(program: Command, version: string) {
  program
    .command('doctor')
    .description('Check that diffity can run correctly')
    .action(() => {
      let ok = true;

      process.stdout.write('  git          ');
      try {
        const gitVersion = execSync('git --version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        console.log(pc.green(`✓ ${gitVersion}`));
      } catch {
        console.log(pc.red('✗ git not found'));
        ok = false;
      }

      process.stdout.write('  git repo     ');
      if (isGitRepo()) {
        console.log(pc.green('✓ inside a git repository'));
      } else {
        console.log(pc.yellow('- not inside a git repository'));
      }

      process.stdout.write('  node         ');
      console.log(pc.green(`✓ ${process.version}`));

      process.stdout.write('  sqlite       ');
      try {
        require('better-sqlite3');
        console.log(pc.green('✓ better-sqlite3 loaded'));
      } catch {
        console.log(pc.red('✗ better-sqlite3 failed to load (native module issue)'));
        ok = false;
      }

      process.stdout.write('  version      ');
      console.log(pc.green(`✓ diffity ${version}`));

      console.log('');
      if (ok) {
        console.log(pc.green('  All checks passed.'));
      } else {
        console.log(pc.red('  Some checks failed. Fix the issues above and try again.'));
        process.exit(1);
      }
    });
}
