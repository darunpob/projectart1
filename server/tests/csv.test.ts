import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { parseCsv, parseTransactionsCsv, toCsv } from '../src/transactions/csv.js';
import type { Transaction } from '../src/transactions/transactions.repository.js';
import { buildTestApp, registerUser, type TestApp } from './test-app.js';

const sample = (overrides: Partial<Transaction>): Transaction => ({
  id: 1,
  type: 'expense',
  amountCents: 12_345,
  category: 'Food & Dining',
  note: '',
  occurredOn: '2026-10-01',
  createdAt: '2026-10-01T00:00:00.000Z',
  ...overrides,
});

describe('csv format', () => {
  it('parses quoted fields, escaped quotes, embedded newlines and a BOM', () => {
    const text = '﻿a,b,c\r\n1,"x, ""y""","multi\nline"\n\n';
    expect(parseCsv(text)).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x, "y"', 'multi\nline'],
    ]);
  });

  it('round-trips exported transactions through the importer', () => {
    const exported = toCsv([
      sample({ note: 'Dinner, "fancy"' }),
      sample({ type: 'income', category: 'Salary', amountCents: 5_000_000, note: '' }),
    ]);

    const { drafts, errors } = parseTransactionsCsv(exported);

    expect(errors).toEqual([]);
    expect(drafts).toEqual([
      { type: 'expense', amountCents: 12_345, category: 'Food & Dining', note: 'Dinner, "fancy"', occurredOn: '2026-10-01' },
      { type: 'income', amountCents: 5_000_000, category: 'Salary', note: '', occurredOn: '2026-10-01' },
    ]);
  });

  it('neutralises spreadsheet formulas on export', () => {
    const exported = toCsv([sample({ note: '=HYPERLINK("http://evil")' })]);
    expect(exported).toContain(`"'=HYPERLINK(""http://evil"")"`);
  });

  it('accepts columns in any order and without a note column', () => {
    const { drafts, errors } = parseTransactionsCsv('Amount,Category,Type,Date\n1250.5,Transport,Expense,2026-10-02');
    expect(errors).toEqual([]);
    expect(drafts[0]).toMatchObject({ amountCents: 125_050, type: 'expense', note: '' });
  });

  it('reports every invalid row with its row number', () => {
    const { errors } = parseTransactionsCsv(
      ['date,type,category,amount', '2026-10-02,expense,Transport,abc', '2026-13-01,expense,Transport,10', '2026-10-02,income,Transport,10'].join('\n'),
    );
    expect(errors.map((rowError) => rowError.row)).toEqual([2, 3, 4]);
    expect(errors[2]?.message).toContain('not a valid income category');
  });

  it('rejects files with missing columns', () => {
    expect(parseTransactionsCsv('date,amount\n2026-10-01,5').errors[0]?.message).toBe('Missing column(s): type, category');
  });
});

describe('csv endpoints', () => {
  let app: TestApp;
  let token: string;
  const authed = (call: request.Test) => call.set('Authorization', `Bearer ${token}`);

  beforeEach(async () => {
    app = buildTestApp();
    token = await registerUser(app);
  });

  it('imports a CSV file atomically and exports it back', async () => {
    const csv = 'date,type,category,amount,note\n2026-10-01,income,Salary,50000,Pay\n2026-10-03,expense,Housing,15000.00,Rent\n';
    const imported = await authed(request(app).post('/api/transactions/import'))
      .set('Content-Type', 'text/csv')
      .send(csv)
      .expect(201);
    expect(imported.body.imported).toBe(2);

    const exported = await authed(request(app).get('/api/transactions/export?month=2026-10')).expect(200);
    expect(exported.headers['content-type']).toContain('text/csv');
    expect(exported.headers['content-disposition']).toContain('spendwise-2026-10.csv');
    expect(exported.text.split('\r\n')).toEqual([
      'date,type,category,amount,note',
      '2026-10-03,expense,Housing,15000.00,Rent',
      '2026-10-01,income,Salary,50000.00,Pay',
      '',
    ]);
  });

  it('saves nothing when any row is invalid', async () => {
    const csv = 'date,type,category,amount\n2026-10-01,income,Salary,100\n2026-10-01,expense,Nope,100\n';
    const rejected = await authed(request(app).post('/api/transactions/import'))
      .set('Content-Type', 'text/csv')
      .send(csv)
      .expect(422);
    expect(rejected.body.error.issues).toEqual([{ path: 'row 3', message: '"Nope" is not a valid expense category' }]);

    const listed = await authed(request(app).get('/api/transactions')).expect(200);
    expect(listed.body.transactions).toHaveLength(0);
  });

  it('requires a CSV content type', async () => {
    await authed(request(app).post('/api/transactions/import')).send({ csv: 'x' }).expect(415);
  });
});
