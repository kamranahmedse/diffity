import { randomUUID } from 'node:crypto';
import { getDb } from './db.js';

export interface ThreadAuthor {
  name: string;
  type: 'user' | 'agent';
}

export interface ThreadComment {
  id: string;
  author: ThreadAuthor;
  body: string;
  createdAt: string;
}

export type ThreadStatus = 'open' | 'resolved' | 'dismissed';

export interface Thread {
  id: string;
  sessionId: string;
  filePath: string;
  side: string;
  startLine: number;
  endLine: number;
  status: ThreadStatus;
  anchorContent: string | null;
  createdAt: string;
  updatedAt: string;
  comments: ThreadComment[];
}

interface ThreadRow {
  id: string;
  session_id: string;
  file_path: string;
  side: string;
  start_line: number;
  end_line: number;
  status: string;
  anchor_content: string | null;
  created_at: string;
  updated_at: string;
}

interface CommentRow {
  id: string;
  thread_id: string;
  author_name: string;
  author_type: string;
  body: string;
  created_at: string;
}

function rowToThread(row: ThreadRow, comments: ThreadComment[]): Thread {
  return {
    id: row.id,
    sessionId: row.session_id,
    filePath: row.file_path,
    side: row.side,
    startLine: row.start_line,
    endLine: row.end_line,
    status: row.status as ThreadStatus,
    anchorContent: row.anchor_content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    comments,
  };
}

function rowToComment(row: CommentRow): ThreadComment {
  return {
    id: row.id,
    author: { name: row.author_name, type: row.author_type as 'user' | 'agent' },
    body: row.body,
    createdAt: row.created_at,
  };
}

function getCommentsForThreads(threadIds: string[]): Map<string, ThreadComment[]> {
  if (threadIds.length === 0) {
    return new Map();
  }
  const db = getDb();
  const placeholders = threadIds.map(() => '?').join(', ');
  const rows = db.prepare(
    `SELECT * FROM comments WHERE thread_id IN (${placeholders}) ORDER BY created_at ASC`
  ).all(...threadIds) as CommentRow[];

  const map = new Map<string, ThreadComment[]>();
  for (const row of rows) {
    const comments = map.get(row.thread_id) ?? [];
    comments.push(rowToComment(row));
    map.set(row.thread_id, comments);
  }
  return map;
}

function getCommentsForThread(threadId: string): ThreadComment[] {
  const map = getCommentsForThreads([threadId]);
  return map.get(threadId) ?? [];
}

export function createThread(
  sessionId: string,
  filePath: string,
  side: string,
  startLine: number,
  endLine: number,
  body: string,
  author: ThreadAuthor,
  anchorContent?: string,
): Thread {
  const db = getDb();
  const threadId = randomUUID();
  const commentId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO comment_threads (id, session_id, file_path, side, start_line, end_line, anchor_content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(threadId, sessionId, filePath, side, startLine, endLine, anchorContent ?? null, now, now);

  db.prepare(
    'INSERT INTO comments (id, thread_id, author_name, author_type, body, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(commentId, threadId, author.name, author.type, body, now);

  return {
    id: threadId,
    sessionId,
    filePath,
    side,
    startLine,
    endLine,
    status: 'open',
    anchorContent: anchorContent ?? null,
    createdAt: now,
    updatedAt: now,
    comments: [{
      id: commentId,
      author,
      body,
      createdAt: now,
    }],
  };
}

export function getThreadsForSession(sessionId: string, status?: ThreadStatus): Thread[] {
  const db = getDb();
  let rows: ThreadRow[];
  if (status) {
    rows = db.prepare(
      'SELECT * FROM comment_threads WHERE session_id = ? AND status = ? ORDER BY created_at ASC'
    ).all(sessionId, status) as ThreadRow[];
  } else {
    rows = db.prepare(
      'SELECT * FROM comment_threads WHERE session_id = ? ORDER BY created_at ASC'
    ).all(sessionId) as ThreadRow[];
  }

  const commentsByThread = getCommentsForThreads(rows.map(r => r.id));
  return rows.map(row => rowToThread(row, commentsByThread.get(row.id) ?? []));
}

export function getThread(idOrPrefix: string): Thread | null {
  const db = getDb();
  let row = db.prepare('SELECT * FROM comment_threads WHERE id = ?').get(idOrPrefix) as ThreadRow | undefined;

  if (!row && idOrPrefix.length >= 8) {
    row = db.prepare('SELECT * FROM comment_threads WHERE id LIKE ?').get(idOrPrefix + '%') as ThreadRow | undefined;
  }

  if (!row) {
    return null;
  }

  return rowToThread(row, getCommentsForThread(row.id));
}

export function addReply(threadId: string, body: string, author: ThreadAuthor): ThreadComment {
  const db = getDb();
  const commentId = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO comments (id, thread_id, author_name, author_type, body, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(commentId, threadId, author.name, author.type, body, now);

  if (author.type === 'user') {
    db.prepare(
      'UPDATE comment_threads SET status = ?, updated_at = ? WHERE id = ?'
    ).run('open', now, threadId);
  } else {
    db.prepare(
      'UPDATE comment_threads SET updated_at = ? WHERE id = ?'
    ).run(now, threadId);
  }

  return {
    id: commentId,
    author,
    body,
    createdAt: now,
  };
}

export function updateThreadStatus(threadId: string, status: ThreadStatus, summaryBody?: string, summaryAuthor?: ThreadAuthor): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    'UPDATE comment_threads SET status = ?, updated_at = ? WHERE id = ?'
  ).run(status, now, threadId);

  if (summaryBody && summaryAuthor) {
    const commentId = randomUUID();
    db.prepare(
      'INSERT INTO comments (id, thread_id, author_name, author_type, body, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(commentId, threadId, summaryAuthor.name, summaryAuthor.type, summaryBody, now);
  }
}

export function deleteThread(threadId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM comment_threads WHERE id = ?').run(threadId);
}

export function deleteAllThreadsForSession(sessionId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM comment_threads WHERE session_id = ?').run(sessionId);
}

export function deleteComment(commentId: string): void {
  const db = getDb();
  const comment = db.prepare('SELECT thread_id FROM comments WHERE id = ?').get(commentId) as { thread_id: string } | undefined;
  if (!comment) {
    return;
  }

  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);

  const remaining = db.prepare('SELECT COUNT(*) as count FROM comments WHERE thread_id = ?').get(comment.thread_id) as { count: number };
  if (remaining.count === 0) {
    db.prepare('DELETE FROM comment_threads WHERE id = ?').run(comment.thread_id);
  }
}
