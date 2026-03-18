import Database from 'better-sqlite3';
import { join } from 'node:path';
import { getDiffityDir } from '@diffity/git';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = join(getDiffityDir(), 'reviews.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrateDb(db);
  return db;
}

function migrateDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_sessions (
      id TEXT PRIMARY KEY,
      ref TEXT NOT NULL,
      head_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comment_threads (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES review_sessions(id),
      file_path TEXT NOT NULL,
      side TEXT NOT NULL,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      anchor_content TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES comment_threads(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      author_type TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_threads_session ON comment_threads(session_id);
    CREATE INDEX IF NOT EXISTS idx_comments_thread ON comments(thread_id);
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
