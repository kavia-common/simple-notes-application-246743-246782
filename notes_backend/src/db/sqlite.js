'use strict';

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * Resolve the SQLite DB path.
 *
 * Supports:
 * - NOTES_DB_PATH env var (recommended for deployments)
 * - default: uses the database container's canonical DB location in this monorepo
 */
function resolveDbPath() {
  // NOTE: orchestrator should set NOTES_DB_PATH in notes_backend .env when needed.
  const fromEnv = process.env.NOTES_DB_PATH;
  if (fromEnv && String(fromEnv).trim()) return String(fromEnv).trim();

  // Monorepo default path (local dev / CI). This matches database/db_connection.txt.
  return path.resolve(__dirname, '../../../..', 'simple-notes-application-246743-246783', 'database', 'myapp.db');
}

const DB_PATH = resolveDbPath();

// Keep a single connection for the app process; sqlite3 driver queues statements.
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to open SQLite database at ${DB_PATH}`, err);
  } else {
    // eslint-disable-next-line no-console
    console.log(`SQLite DB connected: ${DB_PATH}`);
  }
});

// Enforce foreign keys.
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
});

/**
 * Execute a query returning multiple rows.
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<any[]>}
 */
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      return resolve(rows || []);
    });
  });
}

/**
 * Execute a query returning a single row.
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<any|null>}
 */
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      return resolve(row || null);
    });
  });
}

/**
 * Execute a statement (INSERT/UPDATE/DELETE).
 * Resolves with { lastID, changes } from sqlite.
 * @param {string} sql
 * @param {any[]} [params]
 * @returns {Promise<{lastID: number, changes: number}>}
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

/**
 * Run multiple operations in a transaction.
 * @param {(tx: {all: typeof all, get: typeof get, run: typeof run}) => Promise<any>} fn
 * @returns {Promise<any>}
 */
async function transaction(fn) {
  await run('BEGIN');
  try {
    const result = await fn({ all, get, run });
    await run('COMMIT');
    return result;
  } catch (err) {
    try {
      await run('ROLLBACK');
    } catch (rollbackErr) {
      // eslint-disable-next-line no-console
      console.error('Failed to rollback transaction', rollbackErr);
    }
    throw err;
  }
}

module.exports = {
  DB_PATH,
  all,
  get,
  run,
  transaction,
};
