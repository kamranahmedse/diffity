import type { Command } from 'commander';
import pc from 'picocolors';
import { isGitRepo, getDiffFiles, resolveRef } from '@diffity/git';
import { getCurrentSession } from './session.js';
import {
  createThread,
  getThreadsForSession,
  getThread,
  addReply,
  updateThreadStatus,
  type ThreadStatus,
  type Thread,
} from './threads.js';

function requireSession() {
  if (!isGitRepo()) {
    console.error(pc.red('Error: Not a git repository'));
    process.exit(1);
  }

  const session = getCurrentSession();
  if (!session) {
    console.error(pc.red('Error: No active review session.'));
    console.error(pc.dim('Start diffity first to create a session.'));
    process.exit(1);
  }
  return session;
}

function resolveThreadId(shortId: string, sessionId: string): Thread {
  const thread = getThread(shortId);
  if (!thread) {
    console.error(pc.red(`Error: Thread not found: ${shortId}`));
    process.exit(1);
  }
  if (thread.sessionId !== sessionId) {
    console.error(pc.red(`Error: Thread ${shortId} does not belong to current session`));
    process.exit(1);
  }
  return thread;
}

function formatThreadLine(thread: Thread): string {
  const shortId = thread.id.slice(0, 8);
  const isGeneral = thread.filePath === '__general__';
  const statusColor = thread.status === 'open' ? pc.yellow : thread.status === 'resolved' ? pc.green : thread.status === 'dismissed' ? pc.dim : pc.cyan;
  const statusLabel = statusColor(`[${thread.status}]`);
  const firstComment = thread.comments[0]?.body || '';
  const truncated = firstComment.length > 80 ? firstComment.slice(0, 77) + '...' : firstComment;

  if (isGeneral) {
    return `${statusLabel.padEnd(22)} ${pc.dim(shortId)}  ${pc.bold('General comment')}\n${''.padEnd(15)}${pc.dim('"')}${truncated}${pc.dim('"')}`;
  }

  const lineRange = thread.startLine === thread.endLine
    ? `${thread.startLine}`
    : `${thread.startLine}-${thread.endLine}`;
  const location = `${thread.filePath}:${lineRange}`;
  const sideLabel = thread.side === 'old' ? '(old)' : '(new)';

  return `${statusLabel.padEnd(22)} ${pc.dim(shortId)}  ${location} ${pc.dim(sideLabel)}\n${''.padEnd(15)}${pc.dim('"')}${truncated}${pc.dim('"')}`;
}

export function registerAgentCommands(program: Command): void {
  const agent = program
    .command('agent')
    .description('Agent commands for interacting with review comments')
    .addHelpText('after', `
Examples:
  $ diffity agent list --status open --json
  $ diffity agent comment --file src/app.ts --line 42 --body "Missing null check"
  $ diffity agent resolve abc123 --summary "Added null check"
  $ diffity agent reply abc123 --body "Good catch, fixed"
  $ diffity agent general-comment --body "Overall this looks good, just a few nits"`);

  agent
    .command('list')
    .description('List comment threads in the current session (use --json for full details)')
    .option('--status <status>', 'Filter by status (open, resolved, dismissed)')
    .option('--json', 'Output as JSON')
    .action((opts) => {
      const validStatuses = ['open', 'resolved', 'dismissed'];
      if (opts.status && !validStatuses.includes(opts.status)) {
        console.error(pc.red(`Error: Invalid status "${opts.status}". Must be one of: ${validStatuses.join(', ')}`));
        process.exit(1);
      }
      const session = requireSession();
      const threads = getThreadsForSession(session.id, opts.status as ThreadStatus | undefined);

      if (opts.json) {
        console.log(JSON.stringify(threads, null, 2));
        return;
      }

      if (threads.length === 0) {
        console.log(pc.dim('No threads found.'));
        return;
      }

      for (const thread of threads) {
        console.log(formatThreadLine(thread));
      }
    });

  agent
    .command('comment')
    .description('Create a new comment thread')
    .requiredOption('--file <path>', 'File path (relative to repo root)')
    .requiredOption('--line <n>', 'Line number (1-indexed)', parseInt)
    .option('--end-line <n>', 'End line for multi-line comments (1-indexed)', parseInt)
    .option('--side <side>', 'Which side of the diff (new or old)', 'new')
    .requiredOption('--body <text>', 'Comment body')
    .action((opts) => {
      if (opts.side !== 'new' && opts.side !== 'old') {
        console.error(pc.red(`Error: Invalid side "${opts.side}". Must be "new" or "old"`));
        process.exit(1);
      }
      const session = requireSession();
      if (session.ref !== '__tree__') {
        const diffFiles = getDiffFiles(session.ref);
        if (!diffFiles.includes(opts.file)) {
          console.error(pc.red(`Error: File "${opts.file}" is not in the current diff.`));
          console.error(pc.dim(`The diff for ref "${session.ref}" contains ${diffFiles.length} file(s):`));
          for (const f of diffFiles.slice(0, 20)) {
            console.error(pc.dim(`  ${f}`));
          }
          if (diffFiles.length > 20) {
            console.error(pc.dim(`  ... and ${diffFiles.length - 20} more`));
          }
          process.exit(1);
        }
      }
      const endLine = opts.endLine ?? opts.line;
      const thread = createThread(
        session.id,
        opts.file,
        opts.side,
        opts.line,
        endLine,
        opts.body,
        { name: 'Agent', type: 'agent' },
      );
      console.log(pc.green(`Created thread ${thread.id.slice(0, 8)}`));
    });

  agent
    .command('resolve')
    .description('Resolve a thread (marks as fixed)')
    .argument('<thread-id>', 'Thread ID (or 8-char prefix)')
    .option('--summary <text>', 'What was done to resolve it')
    .action((id: string, opts) => {
      const session = requireSession();
      const thread = resolveThreadId(id, session.id);
      const author = opts.summary ? { name: 'Agent', type: 'agent' as const } : undefined;
      updateThreadStatus(thread.id, 'resolved', opts.summary, author);
      console.log(pc.green(`Resolved thread ${thread.id.slice(0, 8)}`));
    });

  agent
    .command('dismiss')
    .description('Dismiss a thread (marks as won\'t fix)')
    .argument('<thread-id>', 'Thread ID (or 8-char prefix)')
    .option('--reason <text>', 'Why the thread is being dismissed')
    .action((id: string, opts) => {
      const session = requireSession();
      const thread = resolveThreadId(id, session.id);
      const author = opts.reason ? { name: 'Agent', type: 'agent' as const } : undefined;
      updateThreadStatus(thread.id, 'dismissed', opts.reason, author);
      console.log(pc.green(`Dismissed thread ${thread.id.slice(0, 8)}`));
    });

  agent
    .command('reply')
    .description('Reply to a comment thread')
    .argument('<thread-id>', 'Thread ID (or 8-char prefix)')
    .requiredOption('--body <text>', 'Reply body')
    .action((id: string, opts) => {
      const session = requireSession();
      const thread = resolveThreadId(id, session.id);
      addReply(thread.id, opts.body, { name: 'Agent', type: 'agent' });
      console.log(pc.green(`Replied to thread ${thread.id.slice(0, 8)}`));
    });

  agent
    .command('general-comment')
    .description('Create a general comment on the entire diff (not tied to a specific file or line)')
    .requiredOption('--body <text>', 'Comment body')
    .action((opts) => {
      const session = requireSession();
      const thread = createThread(
        session.id,
        '__general__',
        'new',
        0,
        0,
        opts.body,
        { name: 'Agent', type: 'agent' },
      );
      console.log(pc.green(`Created general comment ${thread.id.slice(0, 8)}`));
    });

  agent
    .command('diff')
    .description('Output the unified diff for the current session (includes untracked files)')
    .action(() => {
      const session = requireSession();
      const ref = session.ref === '__tree__' ? 'work' : session.ref;
      const raw = resolveRef(ref);
      if (!raw.trim()) {
        console.error(pc.dim('No diff content for current session.'));
        process.exit(0);
      }
      process.stdout.write(raw);
    });
}
