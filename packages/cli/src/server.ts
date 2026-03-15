import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseDiff, type ParsedDiff } from '@diffity/parser';
import {
  getDiff,
  getDiffStat,
  getUntrackedFiles,
  getUntrackedDiff,
  getRepoInfo,
  getFileContent,
  getStagedFiles,
  getUnstagedFiles,
  getRecentCommits,
  getFileLineCount,
  getMergeBase,
  resolveRef,
  revertFile,
  revertHunk,
  isActionableRef,
} from '@diffity/git';
import { findOrCreateSession, getCurrentSession } from './session.js';
import {
  createThread,
  getThreadsForSession,
  addReply,
  updateThreadStatus,
  deleteThread,
  deleteComment,
  type ThreadStatus,
} from './threads.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

interface ServerOptions {
  port: number;
  diffArgs: string[];
  description?: string;
  effectiveRef?: string;
}

function sendJson(res: ServerResponse, data: unknown) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, status: number, message: string) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

function serveStatic(res: ServerResponse, filePath: string) {
  if (!existsSync(filePath)) {
    sendError(res, 404, 'Not found');
    return;
  }
  const ext = extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const content = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': mime });
  res.end(content);
}

function descriptionForRef(ref: string): string {
  switch (ref) {
    case 'staged':
      return 'Staged changes';
    case 'unstaged':
      return 'Unstaged changes';
    case 'working':
      return 'Working tree changes';
    case 'untracked':
      return 'Untracked files';
    case 'work':
      return 'All changes';
    default:
      if (ref.includes('..')) {
        return ref;
      }
      return `Changes from ${ref}`;
  }
}

function resolveBaseRef(ref: string): string {
  if (['staged', 'working', 'work'].includes(ref)) {
    return 'HEAD';
  }
  if (ref === 'unstaged' || ref === 'untracked') {
    return 'HEAD';
  }

  const threeDotsIdx = ref.indexOf('...');
  if (threeDotsIdx !== -1) {
    const left = ref.slice(0, threeDotsIdx);
    const right = ref.slice(threeDotsIdx + 3);
    return getMergeBase(left, right);
  }

  const twoDotsIdx = ref.indexOf('..');
  if (twoDotsIdx !== -1) {
    return ref.slice(0, twoDotsIdx);
  }

  return ref;
}

interface ServerResult {
  port: number;
  close: () => void;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

export function startServer(options: ServerOptions): Promise<ServerResult> {
  const { port, diffArgs, description, effectiveRef } = options;

  let sessionId: string | null = null;
  const reviewsEnabled = isActionableRef(effectiveRef);
  if (reviewsEnabled && effectiveRef) {
    const session = findOrCreateSession(effectiveRef);
    sessionId = session.id;
  }

  const includeUntracked = diffArgs.length === 0;
  function enrichWithLineCounts(diff: ParsedDiff, baseRef: string): ParsedDiff {
    for (const file of diff.files) {
      if (file.status === 'added' || file.isBinary) {
        continue;
      }
      const path = file.oldPath || file.newPath;
      const count = getFileLineCount(path, baseRef);
      if (count !== null) {
        file.oldFileLineCount = count;
      }
    }
    return diff;
  }

  function getFullDiff(args: string[]): string {
    let raw = getDiff(args);
    if (includeUntracked) {
      const untrackedFiles = getUntrackedFiles();
      if (untrackedFiles.length > 0) {
        raw += '\n' + getUntrackedDiff(untrackedFiles);
      }
    }
    return raw;
  }

  const uiDir = join(__dirname, 'ui');

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    const pathname = url.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === '/api/revert-file' && req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const { filePath: path, isUntracked } = body;
        if (!path || typeof path !== 'string') {
          sendError(res, 400, 'Missing filePath');
          return;
        }
        revertFile(path, !!isUntracked);
        sendJson(res, { ok: true });
      } catch (err) {
        sendError(res, 500, `Failed to revert file: ${err}`);
      }
      return;
    }

    if (pathname === '/api/revert-hunk' && req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const { patch } = body;
        if (!patch || typeof patch !== 'string') {
          sendError(res, 400, 'Missing patch');
          return;
        }
        revertHunk(patch);
        sendJson(res, { ok: true });
      } catch (err) {
        sendError(res, 500, `Failed to revert hunk: ${err}`);
      }
      return;
    }

    if (pathname === '/api/overview') {
      try {
        const staged = getStagedFiles();
        const unstaged = getUnstagedFiles();
        const untracked = getUntrackedFiles();

        const fileMap = new Map<string, string>();
        for (const f of staged) {
          fileMap.set(f, 'staged');
        }
        for (const f of unstaged) {
          fileMap.set(f, fileMap.has(f) ? 'modified' : 'modified');
        }
        for (const f of untracked) {
          fileMap.set(f, 'added');
        }

        const files = Array.from(fileMap.entries()).map(([path, status]) => ({ path, status }));

        sendJson(res, { files });
      } catch (err) {
        sendError(res, 500, `Failed to get overview: ${err}`);
      }
      return;
    }

    if (pathname === '/api/commits') {
      const count = parseInt(url.searchParams.get('count') || '10', 10);
      const skip = parseInt(url.searchParams.get('skip') || '0', 10);
      const search = url.searchParams.get('search') || undefined;
      try {
        const commits = getRecentCommits({ count, skip, search });
        sendJson(res, { commits, hasMore: commits.length === count });
      } catch (err) {
        sendError(res, 500, `Failed to get commits: ${err}`);
      }
      return;
    }

    if (pathname === '/api/diff-fingerprint') {
      const ref = url.searchParams.get('ref');
      let stat: string;
      if (ref) {
        switch (ref) {
          case 'work':
          case 'working':
            stat = getDiffStat(['HEAD']) + '\n' + getUntrackedFiles().join('\n');
            break;
          case 'staged':
            stat = getDiffStat(['--staged']);
            break;
          case 'unstaged':
            stat = getDiffStat([]);
            break;
          case 'untracked':
            stat = getUntrackedFiles().join('\n');
            break;
          default:
            stat = getDiffStat([ref]);
            break;
        }
      } else {
        stat = getDiffStat(diffArgs);
        if (includeUntracked) {
          stat += '\n' + getUntrackedFiles().join('\n');
        }
      }
      const hash = createHash('sha1').update(stat).digest('hex').slice(0, 12);
      sendJson(res, { fingerprint: hash });
      return;
    }

    if (pathname === '/api/diff') {
      const ref = url.searchParams.get('ref');
      const whitespace = url.searchParams.get('whitespace');
      const extraArgs = whitespace === 'hide' ? ['-w'] : [];
      const baseRef = ref ? resolveBaseRef(ref) : 'HEAD';

      if (ref) {
        sendJson(res, enrichWithLineCounts(parseDiff(resolveRef(ref, extraArgs)), baseRef));
        return;
      }

      if (whitespace === 'hide') {
        sendJson(res, enrichWithLineCounts(parseDiff(getFullDiff([...diffArgs, '-w'])), baseRef));
        return;
      }
      sendJson(res, enrichWithLineCounts(parseDiff(getFullDiff(diffArgs)), baseRef));
      return;
    }

    if (pathname.startsWith('/api/file/')) {
      const filePath = decodeURIComponent(pathname.slice('/api/file/'.length));
      const ref = url.searchParams.get('ref') || undefined;
      const baseRef = ref ? resolveBaseRef(ref) : 'HEAD';
      try {
        const content = getFileContent(filePath, baseRef);
        sendJson(res, { path: filePath, content: content.split('\n') });
      } catch {
        sendError(res, 404, `File not found: ${filePath}`);
      }
      return;
    }

    if (pathname === '/api/info') {
      const ref = url.searchParams.get('ref');
      const info = getRepoInfo();
      let refDescription = description || diffArgs.join(' ') || 'Unstaged changes';
      if (ref) {
        refDescription = descriptionForRef(ref);
      }
      sendJson(res, {
        ...info,
        description: refDescription,
        capabilities: { reviews: reviewsEnabled },
        sessionId,
      });
      return;
    }

    // --- Review API endpoints ---

    if (pathname === '/api/sessions/current' && req.method === 'GET') {
      const session = getCurrentSession();
      sendJson(res, session);
      return;
    }

    if (pathname === '/api/threads' && req.method === 'GET') {
      const sid = url.searchParams.get('session');
      if (!sid) {
        sendError(res, 400, 'Missing session parameter');
        return;
      }
      const status = url.searchParams.get('status') as ThreadStatus | null;
      const threads = getThreadsForSession(sid, status || undefined);
      sendJson(res, threads);
      return;
    }

    if (pathname === '/api/threads' && req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const { sessionId: sid, filePath, side, startLine, endLine, body: commentBody, author, anchorContent } = body;
        if (!sid || !filePath || !side || typeof startLine !== 'number' || typeof endLine !== 'number' || !commentBody || !author) {
          sendError(res, 400, 'Missing required fields');
          return;
        }
        const thread = createThread(sid, filePath, side, startLine, endLine, commentBody, author, anchorContent);
        sendJson(res, thread);
      } catch (err) {
        sendError(res, 500, `Failed to create thread: ${err}`);
      }
      return;
    }

    const threadReplyMatch = pathname.match(/^\/api\/threads\/([^/]+)\/reply$/);
    if (threadReplyMatch && req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req));
        const { body: commentBody, author } = body;
        if (!commentBody || !author) {
          sendError(res, 400, 'Missing body or author');
          return;
        }
        const comment = addReply(threadReplyMatch[1], commentBody, author);
        sendJson(res, comment);
      } catch (err) {
        sendError(res, 500, `Failed to add reply: ${err}`);
      }
      return;
    }

    const threadStatusMatch = pathname.match(/^\/api\/threads\/([^/]+)\/status$/);
    if (threadStatusMatch && req.method === 'PATCH') {
      try {
        const body = JSON.parse(await readBody(req));
        const { status, summary } = body;
        if (!status) {
          sendError(res, 400, 'Missing status');
          return;
        }
        const summaryAuthor = summary ? { name: 'System', type: 'user' as const } : undefined;
        updateThreadStatus(threadStatusMatch[1], status, summary, summaryAuthor);
        sendJson(res, { ok: true });
      } catch (err) {
        sendError(res, 500, `Failed to update thread status: ${err}`);
      }
      return;
    }

    const threadDeleteMatch = pathname.match(/^\/api\/threads\/([^/]+)$/);
    if (threadDeleteMatch && req.method === 'DELETE') {
      try {
        deleteThread(threadDeleteMatch[1]);
        sendJson(res, { ok: true });
      } catch (err) {
        sendError(res, 500, `Failed to delete thread: ${err}`);
      }
      return;
    }

    const commentDeleteMatch = pathname.match(/^\/api\/comments\/([^/]+)$/);
    if (commentDeleteMatch && req.method === 'DELETE') {
      try {
        deleteComment(commentDeleteMatch[1]);
        sendJson(res, { ok: true });
      } catch (err) {
        sendError(res, 500, `Failed to delete comment: ${err}`);
      }
      return;
    }

    let filePath = join(uiDir, pathname === '/' ? 'index.html' : pathname);
    if (!existsSync(filePath)) {
      filePath = join(uiDir, 'index.html');
    }
    serveStatic(res, filePath);
  });

  const closeFn = () => server.close();

  return new Promise((resolve, reject) => {
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        server.listen(0, () => {
          const addr = server.address();
          if (addr && typeof addr !== 'string') {
            resolve({ port: addr.port, close: closeFn });
          }
        });
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        resolve({ port: addr.port, close: closeFn });
      }
    });
  });
}
