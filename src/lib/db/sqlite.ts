import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH =
  process.env.SQLITE_PATH ||
  path.join(process.cwd(), "data", "gatex.sqlite");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      head TEXT NOT NULL,
      outcome TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      chain_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audits_outcome ON audits(outcome);
    CREATE INDEX IF NOT EXISTS idx_audits_updated ON audits(updated_at);

    CREATE TABLE IF NOT EXISTS policies (
      agent_id TEXT PRIMARY KEY,
      json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledgers (
      agent_id TEXT PRIMARY KEY,
      json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

export function sqlitePath() {
  return DB_PATH;
}
