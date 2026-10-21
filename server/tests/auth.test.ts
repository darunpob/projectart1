import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, registerUser, TEST_JWT_SECRET, type TestApp } from './test-app.js';

describe('auth', () => {
  let app: TestApp;

  beforeEach(() => {
    app = buildTestApp();
  });

  it('registers a user and returns a usable token', async () => {
    const token = await registerUser(app);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);

    expect(me.body.user).toMatchObject({ email: 'ada@example.com', name: 'Ada' });
    expect(me.body.user).not.toHaveProperty('passwordHash');
  });

  it('normalises email case and rejects duplicates', async () => {
    await registerUser(app, 'Ada@Example.com');

    const duplicate = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ada@example.com', password: 'another-pass', name: 'Imposter' })
      .expect(409);

    expect(duplicate.body.error.code).toBe('email_taken');
  });

  it('logs in with valid credentials only', async () => {
    await registerUser(app);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'correct-horse' })
      .expect(200);
    const rejected = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', password: 'wrong-password' })
      .expect(401);

    expect(rejected.body.error.code).toBe('invalid_credentials');
  });

  it('validates registration payloads', async () => {
    const invalid = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short', name: '' })
      .expect(400);

    const paths = invalid.body.error.issues.map((issue: { path: string }) => issue.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'password', 'name']));
  });

  it('rejects missing, forged and expired tokens', async () => {
    await request(app).get('/api/auth/me').expect(401);

    const forged = jwt.sign({ sub: '1' }, 'other-secret');
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`).expect(401);

    const expired = jwt.sign({ sub: '1' }, TEST_JWT_SECRET, { expiresIn: -10 });
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`).expect(401);
  });

  it('returns a JSON 400 for malformed bodies', async () => {
    const malformed = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);

    expect(malformed.body.error.code).toBe('malformed_json');
  });
});
