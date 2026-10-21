import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, registerUser, type TestApp } from './test-app.js';

const groceries = {
  type: 'expense',
  amountCents: 45_050,
  category: 'Food & Dining',
  note: 'Weekly groceries',
  occurredOn: '2026-10-03',
};

describe('transactions', () => {
  let app: TestApp;
  let token: string;

  const api = () => ({
    get: (url: string) => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => request(app).post(url).set('Authorization', `Bearer ${token}`),
    patch: (url: string) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  });

  beforeEach(async () => {
    app = buildTestApp();
    token = await registerUser(app);
  });

  it('requires authentication', async () => {
    await request(app).get('/api/transactions').expect(401);
  });

  it('creates, lists, updates and deletes a transaction', async () => {
    const created = await api().post('/api/transactions').send(groceries).expect(201);
    const id = created.body.transaction.id as number;
    expect(created.body.transaction).toMatchObject(groceries);

    const listed = await api().get('/api/transactions').expect(200);
    expect(listed.body.transactions).toHaveLength(1);

    const updated = await api().patch(`/api/transactions/${id}`).send({ amountCents: 50_000 }).expect(200);
    expect(updated.body.transaction).toMatchObject({ ...groceries, amountCents: 50_000 });

    await api().delete(`/api/transactions/${id}`).expect(204);
    await api().delete(`/api/transactions/${id}`).expect(404);
  });

  it('rejects categories that do not match the transaction type', async () => {
    const rejected = await api()
      .post('/api/transactions')
      .send({ ...groceries, type: 'income' })
      .expect(400);
    expect(rejected.body.error.code).toBe('invalid_category');

    const created = await api().post('/api/transactions').send(groceries).expect(201);
    await api().patch(`/api/transactions/${created.body.transaction.id}`).send({ type: 'income' }).expect(400);
  });

  it('filters by month, type, category and search term', async () => {
    await api().post('/api/transactions').send(groceries).expect(201);
    await api().post('/api/transactions').send({ ...groceries, occurredOn: '2026-09-28', note: 'Old groceries' });
    await api()
      .post('/api/transactions')
      .send({ type: 'income', amountCents: 9_000_000, category: 'Salary', occurredOn: '2026-10-01' });

    const october = await api().get('/api/transactions?month=2026-10').expect(200);
    expect(october.body.transactions).toHaveLength(2);

    const incomes = await api().get('/api/transactions?type=income').expect(200);
    expect(incomes.body.transactions).toHaveLength(1);

    const searched = await api().get('/api/transactions?search=old').expect(200);
    expect(searched.body.transactions.map((entry: { note: string }) => entry.note)).toEqual(['Old groceries']);

    const wildcard = await api().get('/api/transactions?search=%25').expect(200);
    expect(wildcard.body.transactions).toHaveLength(0);
  });

  it('isolates data between users', async () => {
    const created = await api().post('/api/transactions').send(groceries).expect(201);
    const otherToken = await registerUser(app, 'grace@example.com');

    const othersList = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(200);
    expect(othersList.body.transactions).toHaveLength(0);

    await request(app)
      .delete(`/api/transactions/${created.body.transaction.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  it('validates payloads and query parameters', async () => {
    await api().post('/api/transactions').send({ ...groceries, amountCents: -5 }).expect(400);
    await api().post('/api/transactions').send({ ...groceries, occurredOn: '2026-13-40' }).expect(400);
    await api().get('/api/transactions?month=2026-13').expect(400);
    await api().patch('/api/transactions/abc').send({ note: 'x' }).expect(400);
  });

  it('exposes the category catalogue', async () => {
    const catalogue = await api().get('/api/transactions/categories').expect(200);
    expect(catalogue.body.categories.income).toContain('Salary');
    expect(catalogue.body.categories.expense).toContain('Food & Dining');
  });
});
