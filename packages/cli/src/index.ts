#!/usr/bin/env node

import { Command } from 'commander';
import open from 'open';
import pc from 'picocolors';
import { isGitRepo } from '@diffity/git';
import { startServer } from './server.js';
import { registerAgentCommands } from './agent.js';

const program = new Command();

program
  .name('diffity')
  .description('GitHub-style git diff viewer in the browser')
  .version('0.1.0')
  .argument('[refs...]', 'Git refs to diff (e.g. HEAD~3, main, main..feature)')
  .option('--staged', 'Show staged changes (git diff --staged)')
  .option('--port <port>', 'Port to use', '5391')
  .option('--no-open', 'Do not open browser automatically')
  .option('--quiet', 'Minimal terminal output')
  .addHelpText('after', `
Examples:
  $ diffity                    Working tree changes
  $ diffity --staged           Staged changes
  $ diffity HEAD~1             Last commit vs working tree
  $ diffity HEAD~3             Last 3 commits vs working tree
  $ diffity abc1234            Changes since a specific commit
  $ diffity main..feature      Compare branches
  $ diffity main feature       Same as main..feature
  $ diffity v1.0.0..v2.0.0    Compare tags
  $ diffity --staged --port 3000  Staged changes on custom port`)
  .action(async (refs: string[], opts) => {
    if (!isGitRepo()) {
      console.error(pc.red('Error: Not a git repository'));
      process.exit(1);
    }

    const diffArgs: string[] = [];
    let description = '';

    if (opts.staged) {
      diffArgs.push('--staged');
      description = 'Staged changes';
    } else if (refs.length === 1) {
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
    if (opts.staged) {
      effectiveRef = 'staged';
    } else if (refs.length > 0) {
      effectiveRef = refs.length === 2 ? `${refs[0]}..${refs[1]}` : refs[0];
    } else {
      effectiveRef = 'work';
    }

    try {
      const { port: actualPort, close } = await startServer({ port, diffArgs, description, effectiveRef });
      const url = `http://localhost:${actualPort}/?ref=${encodeURIComponent(effectiveRef)}`;

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

registerAgentCommands(program);

program.parse();
