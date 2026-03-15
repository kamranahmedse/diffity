import type { Command } from 'commander';
import pc from 'picocolors';
import { isGitRepo } from '@diffity/git';
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
  const lineRange = thread.startLine === thread.endLine
    ? `${thread.startLine}`
    : `${thread.startLine}-${thread.endLine}`;
  const location = `${thread.filePath}:${lineRange}`;
  const sideLabel = thread.side === 'old' ? '(old)' : '(new)';
  const statusColor = thread.status === 'open' ? pc.yellow : thread.status === 'resolved' ? pc.green : thread.status === 'dismissed' ? pc.dim : pc.cyan;
  const statusLabel = statusColor(`[${thread.status}]`);
  const firstComment = thread.comments[0]?.body || '';
  const truncated = firstComment.length > 80 ? firstComment.slice(0, 77) + '...' : firstComment;

  return `${statusLabel.padEnd(22)} ${pc.dim(shortId)}  ${location} ${pc.dim(sideLabel)}\n${''.padEnd(15)}${pc.dim('"')}${truncated}${pc.dim('"')}`;
}

export function registerAgentCommands(program: Command): void {
  const agent = program
    .command('agent')
    .description('Agent commands for interacting with review comments');

  agent
    .command('list')
    .description('List comment threads in the current session')
    .option('--status <status>', 'Filter by status (open, acknowledged, resolved, dismissed)')
    .option('--json', 'Output as JSON')
    .action((opts) => {
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
    .requiredOption('--file <path>', 'File path')
    .requiredOption('--line <n>', 'Start line number', parseInt)
    .option('--end-line <n>', 'End line number', parseInt)
    .option('--side <side>', 'Side (new or old)', 'new')
    .requiredOption('--body <text>', 'Comment body')
    .action((opts) => {
      const session = requireSession();
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
    .description('Resolve a comment thread')
    .argument('<id>', 'Thread ID (or 8-char prefix)')
    .option('--summary <text>', 'Summary comment')
    .action((id: string, opts) => {
      const session = requireSession();
      const thread = resolveThreadId(id, session.id);
      const author = opts.summary ? { name: 'Agent', type: 'agent' as const } : undefined;
      updateThreadStatus(thread.id, 'resolved', opts.summary, author);
      console.log(pc.green(`Resolved thread ${thread.id.slice(0, 8)}`));
    });

  agent
    .command('dismiss')
    .description('Dismiss a comment thread')
    .argument('<id>', 'Thread ID (or 8-char prefix)')
    .option('--reason <text>', 'Reason for dismissal')
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
    .argument('<id>', 'Thread ID (or 8-char prefix)')
    .requiredOption('--body <text>', 'Reply body')
    .action((id: string, opts) => {
      const session = requireSession();
      const thread = resolveThreadId(id, session.id);
      addReply(thread.id, opts.body, { name: 'Agent', type: 'agent' });
      console.log(pc.green(`Replied to thread ${thread.id.slice(0, 8)}`));
    });
}
