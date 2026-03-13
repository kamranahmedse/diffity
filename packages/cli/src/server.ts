import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseDiff } from '@diffity/parser';
import type { ParsedDiff } from '@diffity/parser';
import { getGitDiff, getRepoInfo, getFileContent } from './git.js';

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

export function startServer(options: ServerOptions): Promise<number> {
  const { port, diffArgs, description } = options;

  let cachedDiff: ParsedDiff | null = null;

  function getDiff(): ParsedDiff {
    if (cachedDiff) {
      return cachedDiff;
    }
    const raw = getGitDiff(diffArgs);
    cachedDiff = parseDiff(raw);
    return cachedDiff;
  }

  const uiDir = join(__dirname, 'ui');

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://localhost:${port}`);
    const pathname = url.pathname;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (pathname === '/api/diff') {
      const whitespace = url.searchParams.get('whitespace');
      if (whitespace === 'hide') {
        const raw = getGitDiff([...diffArgs, '-w']);
        sendJson(res, parseDiff(raw));
        return;
      }
      sendJson(res, getDiff());
      return;
    }

    if (pathname.startsWith('/api/file/')) {
      const filePath = decodeURIComponent(pathname.slice('/api/file/'.length));
      const ref = url.searchParams.get('ref') || undefined;
      try {
        const content = getFileContent(filePath, ref);
        sendJson(res, { path: filePath, content: content.split('\n') });
      } catch {
        sendError(res, 404, `File not found: ${filePath}`);
      }
      return;
    }

    if (pathname === '/api/info') {
      const info = getRepoInfo();
      sendJson(res, {
        ...info,
        description: description || diffArgs.join(' ') || 'unstaged changes',
      });
      return;
    }

    if (pathname === '/api/refresh') {
      cachedDiff = null;
      sendJson(res, { ok: true });
      return;
    }

    let filePath = join(uiDir, pathname === '/' ? 'index.html' : pathname);
    if (!existsSync(filePath)) {
      filePath = join(uiDir, 'index.html');
    }
    serveStatic(res, filePath);
  });

  return new Promise((resolve, reject) => {
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        server.listen(0, () => {
          const addr = server.address();
          if (addr && typeof addr !== 'string') {
            resolve(addr.port);
          }
        });
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        resolve(addr.port);
      }
    });
  });
}
