import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createThread,
  getThreadsForSession,
  addReply,
  updateThreadStatus,
  deleteThread,
  deleteAllThreadsForSession,
  editComment,
  deleteComment,
  type ThreadStatus,
} from './threads.js';
import { getCurrentSession } from './session.js';

function sendJson(res: ServerResponse, data: unknown) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, status: number, message: string) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: message }));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

export function handleReviewRoute(req: IncomingMessage, res: ServerResponse, pathname: string, url: URL): boolean {
  if (pathname === '/api/sessions/current' && req.method === 'GET') {
    const session = getCurrentSession();
    sendJson(res, session);
    return true;
  }

  if (pathname === '/api/threads' && req.method === 'GET') {
    const sid = url.searchParams.get('session');
    if (!sid) {
      sendError(res, 400, 'Missing session parameter');
      return true;
    }
    const status = url.searchParams.get('status') as ThreadStatus | null;
    const threads = getThreadsForSession(sid, status || undefined);
    sendJson(res, threads);
    return true;
  }

  if (pathname === '/api/threads' && req.method === 'DELETE') {
    readBody(req).then((raw) => {
      try {
        const body = JSON.parse(raw);
        const { sessionId: sid } = body;
        if (!sid) {
          sendError(res, 400, 'Missing sessionId');
          return;
        }
        deleteAllThreadsForSession(sid);
        sendJson(res, { ok: true });
      } catch (err) {
        sendError(res, 500, `Failed to delete all threads: ${err}`);
      }
    });
    return true;
  }

  if (pathname === '/api/threads' && req.method === 'POST') {
    readBody(req).then((raw) => {
      try {
        const body = JSON.parse(raw);
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
    });
    return true;
  }

  const threadReplyMatch = pathname.match(/^\/api\/threads\/([^/]+)\/reply$/);
  if (threadReplyMatch && req.method === 'POST') {
    readBody(req).then((raw) => {
      try {
        const body = JSON.parse(raw);
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
    });
    return true;
  }

  const threadStatusMatch = pathname.match(/^\/api\/threads\/([^/]+)\/status$/);
  if (threadStatusMatch && req.method === 'PATCH') {
    readBody(req).then((raw) => {
      try {
        const body = JSON.parse(raw);
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
    });
    return true;
  }

  const threadDeleteMatch = pathname.match(/^\/api\/threads\/([^/]+)$/);
  if (threadDeleteMatch && req.method === 'DELETE') {
    try {
      deleteThread(threadDeleteMatch[1]);
      sendJson(res, { ok: true });
    } catch (err) {
      sendError(res, 500, `Failed to delete thread: ${err}`);
    }
    return true;
  }

  const commentEditMatch = pathname.match(/^\/api\/comments\/([^/]+)$/);
  if (commentEditMatch && req.method === 'PATCH') {
    readBody(req).then((raw) => {
      try {
        const body = JSON.parse(raw);
        const { body: commentBody } = body;
        if (!commentBody) {
          sendError(res, 400, 'Missing body');
          return;
        }
        editComment(commentEditMatch[1], commentBody);
        sendJson(res, { ok: true });
      } catch (err) {
        sendError(res, 500, `Failed to edit comment: ${err}`);
      }
    });
    return true;
  }

  const commentDeleteMatch = pathname.match(/^\/api\/comments\/([^/]+)$/);
  if (commentDeleteMatch && req.method === 'DELETE') {
    try {
      deleteComment(commentDeleteMatch[1]);
      sendJson(res, { ok: true });
    } catch (err) {
      sendError(res, 500, `Failed to delete comment: ${err}`);
    }
    return true;
  }

  return false;
}
