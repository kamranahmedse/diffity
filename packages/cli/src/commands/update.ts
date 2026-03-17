import type { Command } from 'commander';
import { execSync } from 'node:child_process';
import pc from 'picocolors';

export function registerUpdateCommand(program: Command, version: string, skillsHash: string) {
  program
    .command('update')
    .description('Update diffity to the latest version')
    .action(() => {
      try {
        const registry = execSync('npm view diffity version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
        if (registry === version) {
          console.log(pc.green(`Already on the latest version (${version}).`));
          return;
        }
        console.log(`${pc.dim(`Current: ${version}`)} → ${pc.bold(registry)}`);
        console.log(pc.dim('Updating...'));
        execSync('npm install -g diffity@latest', { stdio: 'inherit' });
        console.log(pc.green(`Updated to ${registry}.`));

        try {
          const newHash = execSync('diffity --skills-hash', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
          if (newHash !== skillsHash) {
            console.log('');
            console.log(pc.yellow('Skills have changed in this release. Update them with:'));
            console.log(`  ${pc.cyan('npx skills add kamranahmedse/diffity')}`);
          }
        } catch {}
      } catch {
        console.error(pc.red('Failed to update. Try running: npm install -g diffity@latest'));
        process.exit(1);
      }
    });
}
