import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

/**
 * Amplify Hosting (SSR) runs on Lambda: no durable FS, and native
 * better-sqlite3 often fails to load. Prefer memory there; use SQLite
 * locally / on long-lived Node hosts.
 */
function isServerlessRuntime() {
  return Boolean(
    process.env.GATEX_BUILT_ON_AMPLIFY === "1" ||
      process.env.GATEX_FORCE_MEMORY === "1" ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.AMPLIFY_HOSTING ||
      process.env.AWS_APP_ID,
  );
}

function wantSqlite() {
  if (process.env.GATEX_FORCE_MEMORY === "1") return false;
  if (process.env.GATEX_USE_SQLITE === "1") return true;
  if (isServerlessRuntime()) return false;
  return true;
}

const DB_PATH =
  process.env.SQLITE_PATH ||
  (isServerlessRuntime()
    ? path.join("/tmp", "gatex.sqlite")
    : path.join(process.cwd(), "data", "gatex.sqlite"));

let db: Database.Database | null = null;
let initAttempted = false;
let sqliteOk = false;

function openSqlite(): Database.Database | null {
  if (initAttempted) return db;
  initAttempted = true;

  if (!wantSqlite()) {
    sqliteOk = false;
    return null;
  }

  try {
    // Dynamic require so Amplify never loads the native addon.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const instance = new BetterSqlite3(DB_PATH);
    instance.pragma("journal_mode = WAL");
    instance.exec(`
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
    db = instance;
    sqliteOk = true;
    return db;
  } catch (err) {
    console.warn(
      "[gatex] SQLite unavailable — using in-memory store:",
      err instanceof Error ? err.message : err,
    );
    db = null;
    sqliteOk = false;
    return null;
  }
}

/** Returns DB or null (memory mode). Never throws. */
export function tryGetDb(): Database.Database | null {
  return openSqlite();
}

export function isSqliteLive() {
  openSqlite();
  return sqliteOk;
}

export function sqlitePath() {
  return DB_PATH;
}

export function persistenceMode(): "sqlite" | "memory" {
  return isSqliteLive() ? "sqlite" : "memory";
}
