import { Command } from 'commander';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import open from 'open';
import pc from 'picocolors';
import { isGitRepo, isValidGitRef, getRepoRoot, getRepoName } from '@diffity/git';
import { startServer } from './server.js';
import { registerAgentCommands } from './agent.js';
import { findInstanceForRepo, findAvailablePort, deregisterInstance } from './registry.js';
import { registerOpenCommand } from './commands/open.js';
import { registerListCommand } from './commands/list.js';
import { registerPruneCommand } from './commands/prune.js';
import { registerUpdateCommand } from './commands/update.js';
import { registerDoctorCommand } from './commands/doctor.js';

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

registerOpenCommand(program);
registerListCommand(program);
registerPruneCommand(program);
registerUpdateCommand(program, pkg.version);
registerDoctorCommand(program, pkg.version);
registerAgentCommands(program);

program.parse();
