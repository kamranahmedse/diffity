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
import { sendJson, sendError, withJsonBody } from './http-utils.js';

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
    withJsonBody(res, req, 'Failed to delete all threads', (body) => {
      const { sessionId: sid } = body;
      if (!sid) {
        sendError(res, 400, 'Missing sessionId');
        return;
      }
      deleteAllThreadsForSession(sid as string);
      sendJson(res, { ok: true });
    });
    return true;
  }

  if (pathname === '/api/threads' && req.method === 'POST') {
    withJsonBody(res, req, 'Failed to create thread', (body) => {
      const { sessionId: sid, filePath, side, startLine, endLine, body: commentBody, author, anchorContent } = body;
      if (!sid || !filePath || !side || typeof startLine !== 'number' || typeof endLine !== 'number' || !commentBody || !author) {
        sendError(res, 400, 'Missing required fields');
        return;
      }
      const thread = createThread(
        sid as string, filePath as string, side as string, startLine, endLine,
        commentBody as string, author as { name: string; type: string },
        anchorContent as string | undefined,
      );
      sendJson(res, thread);
    });
    return true;
  }

  const threadReplyMatch = pathname.match(/^\/api\/threads\/([^/]+)\/reply$/);
  if (threadReplyMatch && req.method === 'POST') {
    withJsonBody(res, req, 'Failed to add reply', (body) => {
      const { body: commentBody, author } = body;
      if (!commentBody || !author) {
        sendError(res, 400, 'Missing body or author');
        return;
      }
      const comment = addReply(threadReplyMatch[1], commentBody as string, author as { name: string; type: string });
      sendJson(res, comment);
    });
    return true;
  }

  const threadStatusMatch = pathname.match(/^\/api\/threads\/([^/]+)\/status$/);
  if (threadStatusMatch && req.method === 'PATCH') {
    withJsonBody(res, req, 'Failed to update thread status', (body) => {
      const { status, summary } = body;
      if (!status) {
        sendError(res, 400, 'Missing status');
        return;
      }
      const summaryAuthor = summary ? { name: 'System', type: 'user' as const } : undefined;
      updateThreadStatus(threadStatusMatch[1], status as string, summary as string | undefined, summaryAuthor);
      sendJson(res, { ok: true });
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
    withJsonBody(res, req, 'Failed to edit comment', (body) => {
      const { body: commentBody } = body;
      if (!commentBody) {
        sendError(res, 400, 'Missing body');
        return;
      }
      editComment(commentEditMatch[1], commentBody as string);
      sendJson(res, { ok: true });
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
