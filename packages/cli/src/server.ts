import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseDiff } from '@diffity/parser';
import {
  getDiff,
  getUntrackedFiles,
  getUntrackedDiff,
  getRepoInfo,
  getFileContent,
  getStagedFiles,
  getUnstagedFiles,
  getRecentCommits,
  getMergeBase,
  resolveRef,
} from '@diffity/git';

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
  review?: string;
  commentsFile?: string;
  stdinComments?: string;
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
  const { port, diffArgs, description, review, commentsFile, stdinComments } = options;

  let threads: unknown[] = [];
  if (stdinComments) {
    try {
      threads = JSON.parse(stdinComments);
    } catch {
      console.error('Warning: Could not parse comments from stdin');
    }
  } else if (commentsFile && existsSync(commentsFile)) {
    try {
      threads = JSON.parse(readFileSync(commentsFile, 'utf-8'));
    } catch {
      console.error(`Warning: Could not parse comments file: ${commentsFile}`);
    }
  }

  const includeUntracked = diffArgs.length === 0;
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
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === '/api/comments' && req.method === 'GET') {
      sendJson(res, threads);
      return;
    }

    if (pathname === '/api/comments' && req.method === 'POST') {
      try {
        const body = await readBody(req);
        threads = JSON.parse(body);
        if (commentsFile) {
          writeFileSync(commentsFile, JSON.stringify(threads, null, 2));
        }
        sendJson(res, { ok: true });
      } catch (err) {
        sendError(res, 400, `Invalid JSON: ${err}`);
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

    if (pathname === '/api/diff') {
      const ref = url.searchParams.get('ref');
      const whitespace = url.searchParams.get('whitespace');
      const extraArgs = whitespace === 'hide' ? ['-w'] : [];

      if (ref) {
        sendJson(res, parseDiff(resolveRef(ref, extraArgs)));
        return;
      }

      if (whitespace === 'hide') {
        sendJson(res, parseDiff(getFullDiff([...diffArgs, '-w'])));
        return;
      }
      sendJson(res, parseDiff(getFullDiff(diffArgs)));
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
        review: review || null,
      });
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
