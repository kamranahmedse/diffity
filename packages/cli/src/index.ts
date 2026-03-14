#!/usr/bin/env node

import { Command } from 'commander';
import open from 'open';
import pc from 'picocolors';
import { isGitRepo } from '@diffity/git';
import { startServer } from './server.js';

const program = new Command();

program
  .name('diffity')
  .description('GitHub-style git diff viewer in the browser')
  .version('0.1.0')
  .argument('[refs...]', 'Git refs to diff (commit, branch, range)')
  .option('--staged', 'Show staged changes')
  .option('--port <port>', 'Port to use', '3000')
  .option('--no-open', 'Do not open browser automatically')
  .option('--quiet', 'Minimal terminal output')
  .option('--review <ref>', 'Lock view for code review')
  .option('--comments <file>', 'Load/save comments from JSON file (use "-" for stdin)')
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

    let reviewRef: string | undefined;
    if (opts.review) {
      reviewRef = opts.review;
    }

    let urlRef: string | undefined;
    if (reviewRef) {
      urlRef = reviewRef;
    } else if (opts.staged) {
      urlRef = 'staged';
    } else if (refs.length > 0) {
      urlRef = refs.length === 2 ? `${refs[0]}..${refs[1]}` : refs[0];
    } else {
      urlRef = 'work';
    }

    let commentsFile: string | undefined;
    let stdinComments: string | undefined;

    if (opts.comments === '-') {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer);
      }
      stdinComments = Buffer.concat(chunks).toString();
    } else if (opts.comments) {
      commentsFile = opts.comments;
    }

    try {
      const { port: actualPort, close } = await startServer({ port, diffArgs, description, review: reviewRef, commentsFile, stdinComments });
      const url = urlRef
        ? `http://localhost:${actualPort}/?ref=${encodeURIComponent(urlRef)}`
        : `http://localhost:${actualPort}`;

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

program.parse();
