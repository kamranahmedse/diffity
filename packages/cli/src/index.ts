#!/usr/bin/env node

import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createRequire } from 'node:module';
import open from 'open';
import pc from 'picocolors';
import { isGitRepo } from '@diffity/git';
import { startServer } from './server.js';
import { registerAgentCommands } from './agent.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('diffity')
  .description('GitHub-style git diff viewer in the browser')
  .version(pkg.version)
  .argument('[refs...]', 'Git refs to diff (e.g. HEAD~3, main, main..feature)')
  .option('--port <port>', 'Port to use', '5391')
  .option('--no-open', 'Do not open browser automatically')
  .option('--quiet', 'Minimal terminal output')
  .option('--dark', 'Open in dark mode (default: light)')
  .option('--unified', 'Open in unified view (default: split)')
  .addHelpText('after', `
Examples:
  $ diffity                    Working tree changes
  $ diffity HEAD~1             Last commit vs working tree
  $ diffity HEAD~3             Last 3 commits vs working tree
  $ diffity abc1234            Changes since a specific commit
  $ diffity main..feature      Compare branches
  $ diffity main feature       Same as main..feature
  $ diffity v1.0.0..v2.0.0    Compare tags`)
  .action(async (refs: string[], opts) => {
    if (!isGitRepo()) {
      console.error(pc.red('Error: Not a git repository'));
      process.exit(1);
    }

    const diffArgs: string[] = [];
    let description = '';

    if (refs.length === 1) {
      const ref = refs[0];
      if (ref.includes('..')) {
        diffArgs.push(ref);
        description = ref;
      } else {
        diffArgs.push(ref);
        description = `Changes from ${ref}`;
      }
    } else if (refs.length === 2) {
      diffArgs.push(`${refs[0]}..${refs[1]}`);
      description = `${refs[0]}..${refs[1]}`;
    } else {
      description = 'Unstaged changes';
    }

    const port = parseInt(opts.port, 10);

    let effectiveRef: string;
    if (refs.length > 0) {
      effectiveRef = refs.length === 2 ? `${refs[0]}..${refs[1]}` : refs[0];
    } else {
      effectiveRef = 'work';
    }

    try {
      const { port: actualPort, close } = await startServer({ port, diffArgs, description, effectiveRef });
      const urlParams = new URLSearchParams({ ref: effectiveRef });
      if (opts.dark) {
        urlParams.set('theme', 'dark');
      }
      if (opts.unified) {
        urlParams.set('view', 'unified');
      }
      const url = `http://localhost:${actualPort}/?${urlParams.toString()}`;

      if (!opts.quiet) {
        console.log('');
        console.log(pc.bold('  diffity'));
        console.log(`  ${pc.dim(description)}`);
        console.log('');
        console.log(`  ${pc.green('→')} ${pc.cyan(url)}`);
        console.log(`  ${pc.dim('Press Ctrl+C to stop')}`);
        console.log('');
      }

      process.on('SIGINT', () => {
        if (!opts.quiet) {
          console.log(pc.dim('\n  Shutting down...'));
        }
        close();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        close();
        process.exit(0);
      });

      if (opts.open !== false) {
        await open(url);
      }
    } catch (err) {
      console.error(pc.red(`Failed to start server: ${err}`));
      process.exit(1);
    }
  });

program
  .command('prune')
  .description('Remove all diffity data (database, sessions) for all repos')
  .action(() => {
    const dir = join(homedir(), '.diffity');
    if (!existsSync(dir)) {
      console.log(pc.dim('Nothing to prune.'));
      return;
    }

    rmSync(dir, { recursive: true, force: true });
    console.log(pc.green('Pruned all diffity data (~/.diffity).'));
  });

program
  .command('update')
  .description('Update diffity to the latest version')
  .action(() => {
    try {
      const registry = execSync('npm view diffity version', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
      if (registry === pkg.version) {
        console.log(pc.green(`Already on the latest version (${pkg.version}).`));
        return;
      }
      console.log(`${pc.dim(`Current: ${pkg.version}`)} → ${pc.bold(registry)}`);
      console.log(pc.dim('Updating...'));
      execSync('npm install -g diffity@latest', { stdio: 'inherit' });
      console.log(pc.green(`Updated to ${registry}.`));
    } catch {
      console.error(pc.red('Failed to update. Try running: npm install -g diffity@latest'));
      process.exit(1);
    }
  });

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
    console.log(pc.green(`✓ diffity ${pkg.version}`));

    console.log('');
    if (ok) {
      console.log(pc.green('  All checks passed.'));
    } else {
      console.log(pc.red('  Some checks failed. Fix the issues above and try again.'));
      process.exit(1);
    }
  });

registerAgentCommands(program);

program.parse();
