import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { LATEST_SCHEMA_VERSION, openDatabase, schemaVersion } from '../src/db/database.js';
import { dueOccurrences, nextOccurrence, occurrenceDate } from '../src/recurring/recurring.schedule.js';
import { buildTestApp, registerUser, type TestApp } from './test-app.js';

describe('recurring schedule', () => {
  it('clamps the day to the end of shorter months', () => {
    expect(occurrenceDate('2026-02', 31)).toBe('2026-02-28');
    expect(occurrenceDate('2028-02', 30)).toBe('2028-02-29');
    expect(occurrenceDate('2026-04', 31)).toBe('2026-04-30');
  });

  it('catches up every missed month up to today', () => {
    const due = dueOccurrences({ dayOfMonth: 15, startMonth: '2026-07', lastGeneratedMonth: null }, '2026-10-14');
    expect(due).toEqual(['2026-07-15', '2026-08-15', '2026-09-15']);
  });

  it('resumes after the last generated month and respects a future start', () => {
    expect(dueOccurrences({ dayOfMonth: 1, startMonth: '2026-01', lastGeneratedMonth: '2026-09' }, '2026-10-21')).toEqual([
      '2026-10-01',
    ]);
    expect(dueOccurrences({ dayOfMonth: 1, startMonth: '2026-12', lastGeneratedMonth: null }, '2026-10-21')).toEqual([]);
  });

  it('computes the next upcoming occurrence', () => {
    expect(nextOccurrence({ dayOfMonth: 31, startMonth: '2026-01', lastGeneratedMonth: '2026-10' }, '2026-10-31')).toBe(
      '2026-11-30',
    );
  });
});

describe('recurring rules API', () => {
  let app: TestApp;
  let token: string;
  let now: Date;
  const authed = (call: request.Test) => call.set('Authorization', `Bearer ${token}`);
  const rent = { type: 'expense', amountCents: 1_500_000, category: 'Housing', note: 'Rent', dayOfMonth: 1 };

  const listTransactions = async () =>
    (await authed(request(app).get('/api/transactions')).expect(200)).body.transactions as {
      occurredOn: string;
      recurringRuleId: number | null;
    }[];

  beforeEach(async () => {
    now = new Date('2026-10-21T09:00:00Z');
    app = buildTestApp(() => now);
    token = await registerUser(app);
  });

  it('generates past-due occurrences on creation and links them to the rule', async () => {
    const created = await authed(request(app).post('/api/recurring'))
      .send({ ...rent, startMonth: '2026-08' })
      .expect(201);

    const transactions = await listTransactions();
    expect(transactions.map((entry) => entry.occurredOn)).toEqual(['2026-10-01', '2026-09-01', '2026-08-01']);
    expect(transactions.every((entry) => entry.recurringRuleId === created.body.rule.id)).toBe(true);
  });

  it('is idempotent across repeated requests and fills new months as time passes', async () => {
    await authed(request(app).post('/api/recurring')).send(rent).expect(201);
    await listTransactions();
    expect(await listTransactions()).toHaveLength(1);

    now = new Date('2026-12-02T09:00:00Z');
    expect((await listTransactions()).map((entry) => entry.occurredOn)).toEqual(['2026-12-01', '2026-11-01', '2026-10-01']);
  });

  it('reports the next occurrence and skips paused months when resumed', async () => {
    const created = await authed(request(app).post('/api/recurring')).send({ ...rent, dayOfMonth: 25 }).expect(201);
    const id = created.body.rule.id as number;

    const listed = await authed(request(app).get('/api/recurring')).expect(200);
    expect(listed.body.rules[0].nextOccurrence).toBe('2026-10-25');

    await authed(request(app).patch(`/api/recurring/${id}`)).send({ active: false }).expect(200);
    now = new Date('2027-01-26T09:00:00Z');
    expect(await listTransactions()).toHaveLength(0);

    await authed(request(app).patch(`/api/recurring/${id}`)).send({ active: true }).expect(200);
    expect(await listTransactions()).toHaveLength(0);

    now = new Date('2027-02-25T09:00:00Z');
    expect((await listTransactions()).map((entry) => entry.occurredOn)).toEqual(['2027-02-25']);
  });

  it('keeps generated history when a rule is deleted', async () => {
    const created = await authed(request(app).post('/api/recurring')).send(rent).expect(201);
    await authed(request(app).delete(`/api/recurring/${created.body.rule.id}`)).expect(204);
    await authed(request(app).delete(`/api/recurring/${created.body.rule.id}`)).expect(404);

    const transactions = await listTransactions();
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.recurringRuleId).toBeNull();
  });

  it('validates categories, days and ownership', async () => {
    await authed(request(app).post('/api/recurring')).send({ ...rent, category: 'Salary' }).expect(400);
    await authed(request(app).post('/api/recurring')).send({ ...rent, dayOfMonth: 32 }).expect(400);

    const created = await authed(request(app).post('/api/recurring')).send(rent).expect(201);
    const otherToken = await registerUser(app, 'grace@example.com');
    await request(app)
      .patch(`/api/recurring/${created.body.rule.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ active: false })
      .expect(404);
  });
});

describe('schema migrations', () => {
  it('upgrades a pre-versioning database without losing data', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'spendwise-migrate-'));
    const file = path.join(dir, 'legacy.db');
    try {
      const legacy = new DatabaseSync(file);
      legacy.exec(`
        CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT 'x');
        CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, type TEXT NOT NULL,
          amount_cents INTEGER NOT NULL, category TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
          occurred_on TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT 'x');
        INSERT INTO users (email, name, password_hash) VALUES ('old@example.com', 'Old', 'hash');
        INSERT INTO transactions (user_id, type, amount_cents, category, occurred_on) VALUES (1, 'expense', 100, 'Other', '2026-01-01');
      `);
      legacy.close();

      const upgraded = openDatabase(file);
      expect(schemaVersion(upgraded)).toBe(LATEST_SCHEMA_VERSION);
      expect(upgraded.prepare('SELECT recurring_rule_id FROM transactions').get()).toEqual(
        expect.objectContaining({ recurring_rule_id: null }),
      );
      upgraded.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
