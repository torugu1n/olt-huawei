import Database from 'better-sqlite3';
import config from './config.js';

const db = new Database(config.DATABASE_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    username         TEXT    UNIQUE NOT NULL,
    full_name        TEXT    NOT NULL,
    hashed_password  TEXT    NOT NULL,
    is_active        INTEGER NOT NULL DEFAULT 1,
    is_admin         INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT    NOT NULL,
    action    TEXT    NOT NULL,
    detail    TEXT,
    success   INTEGER NOT NULL DEFAULT 1,
    timestamp TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
