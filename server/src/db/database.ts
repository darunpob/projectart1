import { DatabaseSync } from 'node:sqlite';

const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type         TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    category     TEXT NOT NULL,
    note         TEXT NOT NULL DEFAULT '',
    occurred_on  TEXT NOT NULL,
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user_date
    ON transactions (user_id, occurred_on);

  CREATE TABLE IF NOT EXISTS budgets (
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category     TEXT NOT NULL,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    PRIMARY KEY (user_id, category)
  );
  `,
  `
  CREATE TABLE recurring_rules (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                 TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount_cents         INTEGER NOT NULL CHECK (amount_cents > 0),
    category             TEXT NOT NULL,
    note                 TEXT NOT NULL DEFAULT '',
    day_of_month         INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
    start_month          TEXT NOT NULL,
    last_generated_month TEXT,
    active               INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX idx_recurring_rules_user ON recurring_rules (user_id, active);

  ALTER TABLE transactions
    ADD COLUMN recurring_rule_id INTEGER REFERENCES recurring_rules(id) ON DELETE SET NULL;

  CREATE UNIQUE INDEX idx_transactions_recurring_occurrence
    ON transactions (recurring_rule_id, occurred_on)
    WHERE recurring_rule_id IS NOT NULL;
  `,
];

export type Database = DatabaseSync;

function schemaVersion(db: Database): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number };
  return row.user_version;
}

function migrate(db: Database): void {
  for (let version = schemaVersion(db); version < MIGRATIONS.length; version += 1) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[version] ?? '');
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec('COMMIT');
    } catch (cause) {
      db.exec('ROLLBACK');
      throw new Error(`Database migration ${version + 1} failed`, { cause });
    }
  }
}

export function openDatabase(path: string): Database {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  migrate(db);
  return db;
}

export const LATEST_SCHEMA_VERSION = MIGRATIONS.length;
export { schemaVersion };
