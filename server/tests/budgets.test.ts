import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { classifyBudget } from '../src/budgets/budgets.service.js';
import { buildTestApp, registerUser, type TestApp } from './test-app.js';

describe('budgets', () => {
  let app: TestApp;
  let token: string;

  const authed = (call: request.Test) => call.set('Authorization', `Bearer ${token}`);
  const spend = (category: string, amountCents: number, occurredOn = '2026-10-10') =>
    authed(request(app).post('/api/transactions'))
      .send({ type: 'expense', amountCents, category, occurredOn })
      .expect(201);

  beforeEach(async () => {
    app = buildTestApp();
    token = await registerUser(app);
  });

  it('reports spending against each budget for the selected month', async () => {
    await authed(request(app).put('/api/budgets/Food%20%26%20Dining')).send({ limitCents: 500_000 }).expect(204);
    await authed(request(app).put('/api/budgets/Transport')).send({ limitCents: 100_000 }).expect(204);
    await spend('Food & Dining', 450_000);
    await spend('Transport', 120_000);
    await spend('Transport', 999_999, '2026-09-30');

    const response = await authed(request(app).get('/api/budgets?month=2026-10')).expect(200);

    expect(response.body.budgets).toEqual([
      expect.objectContaining({ category: 'Food & Dining', spentCents: 450_000, status: 'warning', remainingCents: 50_000 }),
      expect.objectContaining({ category: 'Transport', spentCents: 120_000, status: 'over', remainingCents: -20_000 }),
    ]);
  });

  it('updates an existing budget instead of duplicating it', async () => {
    await authed(request(app).put('/api/budgets/Housing')).send({ limitCents: 100 }).expect(204);
    await authed(request(app).put('/api/budgets/Housing')).send({ limitCents: 900 }).expect(204);

    const response = await authed(request(app).get('/api/budgets?month=2026-10')).expect(200);
    expect(response.body.budgets).toHaveLength(1);
    expect(response.body.budgets[0].limitCents).toBe(900);
  });

  it('only accepts expense categories and positive limits', async () => {
    await authed(request(app).put('/api/budgets/Salary')).send({ limitCents: 100 }).expect(400);
    await authed(request(app).put('/api/budgets/Housing')).send({ limitCents: 0 }).expect(400);
  });

  it('deletes budgets and 404s on unknown ones', async () => {
    await authed(request(app).put('/api/budgets/Housing')).send({ limitCents: 100 }).expect(204);
    await authed(request(app).delete('/api/budgets/Housing')).expect(204);
    await authed(request(app).delete('/api/budgets/Housing')).expect(404);
  });

  it('keeps budgets private to their owner', async () => {
    await authed(request(app).put('/api/budgets/Housing')).send({ limitCents: 100 }).expect(204);
    const otherToken = await registerUser(app, 'grace@example.com');

    const response = await request(app).get('/api/budgets').set('Authorization', `Bearer ${otherToken}`).expect(200);
    expect(response.body.budgets).toEqual([]);
  });
});

describe('classifyBudget', () => {
  it.each([
    [0, 'on-track'],
    [79, 'on-track'],
    [80, 'warning'],
    [100, 'warning'],
    [101, 'over'],
  ])('spent %i of 100 is %s', (spentCents, status) => {
    expect(classifyBudget({ category: 'Housing', limitCents: 100, spentCents }).status).toBe(status);
  });
});
