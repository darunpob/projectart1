import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { shiftMonth } from '../src/transactions/month.js';
import { buildTestApp, registerUser, type TestApp } from './test-app.js';

describe('monthly summary', () => {
  let app: TestApp;
  let token: string;

  const record = (entry: Record<string, unknown>) =>
    request(app).post('/api/transactions').set('Authorization', `Bearer ${token}`).send(entry).expect(201);

  beforeEach(async () => {
    app = buildTestApp();
    token = await registerUser(app);
    await record({ type: 'income', amountCents: 5_000_000, category: 'Salary', occurredOn: '2026-10-01' });
    await record({ type: 'expense', amountCents: 1_200_000, category: 'Housing', occurredOn: '2026-10-02' });
    await record({ type: 'expense', amountCents: 300_000, category: 'Food & Dining', occurredOn: '2026-10-05' });
    await record({ type: 'expense', amountCents: 200_000, category: 'Food & Dining', occurredOn: '2026-10-31' });
    await record({ type: 'expense', amountCents: 999_900, category: 'Travel', occurredOn: '2026-08-15' });
  });

  it('aggregates totals, savings rate and category breakdown for a month', async () => {
    const response = await request(app)
      .get('/api/summary?month=2026-10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.summary).toMatchObject({
      month: '2026-10',
      incomeCents: 5_000_000,
      expenseCents: 1_700_000,
      balanceCents: 3_300_000,
      savingsRate: 0.66,
      expenseByCategory: [
        { category: 'Housing', totalCents: 1_200_000 },
        { category: 'Food & Dining', totalCents: 500_000 },
      ],
    });
  });

  it('returns a zero-filled six month trend ending at the selected month', async () => {
    const response = await request(app)
      .get('/api/summary?month=2026-10')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const trend = response.body.summary.trend as { month: string; expenseCents: number }[];
    expect(trend.map((point) => point.month)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
    ]);
    expect(trend[3]?.expenseCents).toBe(999_900);
    expect(trend[4]?.expenseCents).toBe(0);
  });

  it('reports a null savings rate when there is no income', async () => {
    const response = await request(app)
      .get('/api/summary?month=2026-08')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.summary.savingsRate).toBeNull();
  });
});

describe('shiftMonth', () => {
  it('crosses year boundaries in both directions', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-10', -5)).toBe('2026-05');
  });
});
