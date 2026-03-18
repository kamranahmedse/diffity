import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
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
  normalizeRef,
  resolveBaseRef,
  resolveRef,
  revertFile,
  revertHunk,
  getRefCapabilities,
  getHeadHash,
  isDirty,
} from '@diffity/git';
import {
  detectRemote as detectGitHubRemote,
  fetchDetails as fetchGitHubDetails,
  pushComments as pushGitHubComments,
  pullComments as pullGitHubComments,
  type PrComment,
} from '@diffity/github';
import { findOrCreateSession } from './session.js';
import { createThread, getThreadsForSession } from './threads.js';
import { handleReviewRoute } from './review-routes.js';
import {
  registerInstance,
  deregisterInstance
} from './registry.js';

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
  portIsExplicit?: boolean;
  diffArgs: string[];
  description?: string;
  effectiveRef?: string;
  registryInfo?: {
    repoRoot: string;
    repoHash: string;
    repoName: string;
  };
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
  const {
    port,
    portIsExplicit,
    diffArgs,
    description,
    effectiveRef,
    registryInfo,
  } = options;

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

  const githubRemote = detectGitHubRemote();
  const uiDir = join(__dirname, 'ui');

  const server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url || '/', `http://localhost:${port}`);
        const pathname = url.pathname;

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, PATCH, DELETE, OPTIONS',
        );
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
              fileMap.set(f, 'modified');
            }
            for (const f of untracked) {
              fileMap.set(f, 'added');
            }

            const files = Array.from(fileMap.entries()).map(
              ([path, status]) => ({ path, status }),
            );

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
                stat =
                  getDiffStat(['HEAD']) + '\n' + getUntrackedFiles().join('\n');
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
                stat = getDiffStat([normalizeRef(ref)]);
                break;
            }
          } else {
            stat = getDiffStat(diffArgs);
            if (includeUntracked) {
              stat += '\n' + getUntrackedFiles().join('\n');
            }
          }
          const hash = createHash('sha1')
            .update(stat)
            .digest('hex')
            .slice(0, 12);
          sendJson(res, { fingerprint: hash });
          return;
        }

        if (pathname === '/api/diff') {
          const ref = url.searchParams.get('ref');
          const whitespace = url.searchParams.get('whitespace');
          const extraArgs = whitespace === 'hide' ? ['-w'] : [];
          const baseRef = ref ? resolveBaseRef(ref) : 'HEAD';

          if (ref) {
            sendJson(
              res,
              enrichWithLineCounts(
                parseDiff(resolveRef(ref, extraArgs)),
                baseRef,
              ),
            );
            return;
          }

          if (whitespace === 'hide') {
            sendJson(
              res,
              enrichWithLineCounts(
                parseDiff(getFullDiff([...diffArgs, '-w'])),
                baseRef,
              ),
            );
            return;
          }
          sendJson(
            res,
            enrichWithLineCounts(parseDiff(getFullDiff(diffArgs)), baseRef),
          );
          return;
        }

        if (pathname.startsWith('/api/file/')) {
          const filePath = decodeURIComponent(
            pathname.slice('/api/file/'.length),
          );
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
          const ref = url.searchParams.get('ref') || effectiveRef;
          const info = getRepoInfo();
          let refDescription =
            description || diffArgs.join(' ') || 'Unstaged changes';
          if (url.searchParams.get('ref')) {
            refDescription = descriptionForRef(url.searchParams.get('ref')!);
          }
          const capabilities = getRefCapabilities(ref);
          let sessionId: string | null = null;
          if (ref) {
            const session = findOrCreateSession(ref);
            sessionId = session.id;
          }
          sendJson(res, {
            ...info,
            description: refDescription,
            capabilities,
            sessionId,
            github: githubRemote,
          });
          return;
        }

        if (pathname === '/api/github/details') {
          if (!githubRemote) {
            sendJson(res, null);
            return;
          }
          const details = fetchGitHubDetails(githubRemote.owner, githubRemote.repo);
          sendJson(res, details);
          return;
        }

        if (pathname === '/api/github/push-comments' && req.method === 'POST') {
          const details = githubRemote ? fetchGitHubDetails(githubRemote.owner, githubRemote.repo) : null;
          if (!githubRemote || !details?.headSha) {
            sendError(res, 400, 'No GitHub PR detected');
            return;
          }
          const localHead = getHeadHash();
          if (localHead !== details.headSha) {
            sendError(res, 409, 'Local branch is out of sync with the PR. Push or pull your git changes first.');
            return;
          }
          if (isDirty()) {
            sendError(res, 409, 'You have uncommitted local changes. Commit or stash them first.');
            return;
          }
          const body = JSON.parse(await readBody(req));
          const comments = body.comments as PrComment[];
          if (!Array.isArray(comments) || comments.length === 0) {
            sendError(res, 400, 'No comments provided');
            return;
          }
          const result = pushGitHubComments(
            githubRemote.owner,
            githubRemote.repo,
            details.prNumber,
            details.headSha,
            comments,
          );
          sendJson(res, result);
          return;
        }

        if (pathname === '/api/github/pull-comments' && req.method === 'POST') {
          if (!githubRemote) {
            sendError(res, 400, 'No GitHub repo detected');
            return;
          }
          const details = fetchGitHubDetails(githubRemote.owner, githubRemote.repo);
          if (!details) {
            sendError(res, 400, 'No GitHub PR detected');
            return;
          }
          const body = JSON.parse(await readBody(req));
          const { sessionId: sid } = body;
          if (!sid) {
            sendError(res, 400, 'Missing sessionId');
            return;
          }

          const localHead = getHeadHash();
          if (localHead !== details.headSha) {
            sendError(res, 409, 'Local branch is out of sync with the PR. Push or pull your git changes first.');
            return;
          }
          if (isDirty()) {
            sendError(res, 409, 'You have uncommitted local changes. Commit or stash them first.');
            return;
          }

          const remoteComments = pullGitHubComments(githubRemote.owner, githubRemote.repo, details.prNumber);
          const localThreads = getThreadsForSession(sid);

          let pulled = 0;
          let skipped = 0;
          for (const rc of remoteComments) {
            const alreadyExists = localThreads.some(t =>
              t.filePath === rc.filePath &&
              t.side === rc.side &&
              t.startLine === rc.startLine &&
              t.endLine === rc.endLine &&
              t.comments.some(c => c.body === rc.body),
            );
            if (alreadyExists) {
              skipped++;
              continue;
            }
            createThread(sid, rc.filePath, rc.side, rc.startLine, rc.endLine, rc.body, {
              name: rc.authorName,
              type: rc.authorType,
            });
            pulled++;
          }
          sendJson(res, { pulled, skipped });
          return;
        }

        if (handleReviewRoute(req, res, pathname, url)) {
          return;
        }

        let filePath = join(uiDir, pathname === '/' ? 'index.html' : pathname);
        if (!existsSync(filePath)) {
          filePath = join(uiDir, 'index.html');
        }
        serveStatic(res, filePath);
      } catch (err) {
        if (!res.headersSent) {
          sendError(res, 500, `${err instanceof Error ? err.message : err}`);
        }
      }
    },
  );

  const closeFn = () => {
    deregisterInstance(process.pid);
    server.close();
  };

  return new Promise((resolve, reject) => {
    let currentPort = port;
    let retries = 0;
    const maxRetries = portIsExplicit ? 0 : 10;

    const onError = (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && retries < maxRetries) {
        retries++;
        server.close();
        currentPort++;
        setTimeout(() => server.listen(currentPort), 200);
      } else if (err.code === 'EADDRINUSE' && portIsExplicit) {
        reject(new Error(`Port ${port} is already in use`));
      } else {
        reject(err);
      }
    };

    server.on('error', onError);
    server.on('listening', () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        if (effectiveRef) {
          findOrCreateSession(effectiveRef);
        }
        if (registryInfo) {
          registerInstance({
            pid: process.pid,
            port: addr.port,
            repoRoot: registryInfo.repoRoot,
            repoHash: registryInfo.repoHash,
            repoName: registryInfo.repoName,
            ref: effectiveRef || 'work',
            description: description || 'Unstaged changes',
            startedAt: new Date().toISOString(),
          });
        }
        resolve({ port: addr.port, close: closeFn });
      }
    });

    server.listen(currentPort);
  });
}
