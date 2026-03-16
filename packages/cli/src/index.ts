import { Command } from 'commander';
import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import open from 'open';
import pc from 'picocolors';
import { isGitRepo, isValidGitRef, getRepoRoot, getRepoName } from '@diffity/git';
import { startServer } from './server.js';
import { registerAgentCommands } from './agent.js';
import { findInstanceForRepo, findAvailablePort, readRegistry, deregisterInstance } from './registry.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
  .name('diffity')
  .description('GitHub-style git diff viewer in the browser')
  .version(pkg.version)
  .argument('[refs...]', 'Git refs to diff (e.g. HEAD~3, main, main..feature)')
  .option('--port <port>', 'Port to use (default: auto-assigned from 5391)', '5391')
  .option('--no-open', 'Do not open browser automatically')
  .option('--quiet', 'Minimal terminal output')
  .option('--dark', 'Open in dark mode (default: light)')
  .option('--unified', 'Open in unified view (default: split)')
  .option('--new', 'Stop existing instance and start fresh')
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

    for (const ref of refs) {
      if (!isValidGitRef(ref)) {
        console.error(pc.red(`Error: '${ref}' is not a valid git reference.`));
        console.log('');
        console.log('Usage:');
        console.log(`  ${pc.cyan('diffity')}                    Working tree changes`);
        console.log(`  ${pc.cyan('diffity HEAD~1')}             Last commit vs working tree`);
        console.log(`  ${pc.cyan('diffity main..feature')}      Compare branches`);
        console.log(`  ${pc.cyan('diffity main feature')}       Same as main..feature`);
        console.log('');
        console.log(`Run ${pc.cyan('diffity --help')} for more options.`);
        process.exit(1);
      }
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

    let effectiveRef: string;
    if (refs.length > 0) {
      effectiveRef = refs.length === 2 ? `${refs[0]}..${refs[1]}` : refs[0];
    } else {
      effectiveRef = 'work';
    }

    const repoRoot = getRepoRoot();
    const repoHash = createHash('sha256').update(repoRoot).digest('hex').slice(0, 12);
    const repoName = getRepoName();

    const existing = findInstanceForRepo(repoHash);
    if (existing) {
      if (opts.new) {
        try {
          process.kill(existing.pid, 'SIGTERM');
        } catch {}
        deregisterInstance(existing.pid);
        if (!opts.quiet) {
          console.log(pc.dim(`  Stopped existing instance (pid ${existing.pid})`));
        }
      } else {
        const urlParams = new URLSearchParams({ ref: effectiveRef });
        if (opts.dark) {
          urlParams.set('theme', 'dark');
        }
        if (opts.unified) {
          urlParams.set('view', 'unified');
        }
        const url = `http://localhost:${existing.port}/?${urlParams.toString()}`;

        if (!opts.quiet) {
          console.log('');
          console.log(pc.bold('  diffity'));
          console.log(`  ${pc.dim('Already running for this repo')}`);
          console.log('');
          console.log(`  ${pc.green('→')} ${pc.cyan(url)}`);
          console.log('');
        }

        if (opts.open !== false) {
          await open(url);
        }
        return;
      }
    }

    const explicitPort = program.getOptionValueSource('port') === 'cli';
    const port = explicitPort ? parseInt(opts.port, 10) : findAvailablePort();

    try {
      const { port: actualPort, close } = await startServer({
        port,
        portIsExplicit: explicitPort,
        diffArgs,
        description,
        effectiveRef,
        registryInfo: { repoRoot, repoHash, repoName },
      });
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
        deregisterInstance(process.pid);
        close();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        deregisterInstance(process.pid);
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
  .command('list')
  .description('List all running diffity instances')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const entries = readRegistry();

    if (opts.json) {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    if (entries.length === 0) {
      console.log(pc.dim('No running diffity instances.'));
      return;
    }

    console.log('');
    console.log(
      `  ${pc.dim('PORT')}   ${pc.dim('PID'.padEnd(8))}${pc.dim('REPO'.padEnd(22))}${pc.dim('REF'.padEnd(22))}${pc.dim('STARTED')}`,
    );

    for (const entry of entries) {
      const ago = getTimeAgo(entry.startedAt);
      console.log(
        `  ${String(entry.port).padEnd(7)}${String(entry.pid).padEnd(8)}${entry.repoName.slice(0, 20).padEnd(22)}${entry.ref.slice(0, 20).padEnd(22)}${pc.dim(ago)}`,
      );
    }
    console.log('');
  });

function getTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) {
    return 'just now';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

program
  .command('prune')
  .description('Remove all diffity data (database, sessions) for all repos')
  .action(() => {
    const dir = join(homedir(), '.diffity');
    if (!existsSync(dir)) {
      console.log(pc.dim('Nothing to prune.'));
      return;
    }

    const running = readRegistry();
    for (const entry of running) {
      try {
        process.kill(entry.pid, 'SIGTERM');
      } catch {}
    }
    if (running.length > 0) {
      console.log(pc.dim(`  Stopped ${running.length} running instance${running.length > 1 ? 's' : ''}.`));
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
