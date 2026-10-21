import request from 'supertest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/database.js';

export const TEST_JWT_SECRET = 'test-secret';

export function buildTestApp(clock?: () => Date) {
  return createApp({ db: openDatabase(':memory:'), jwtSecret: TEST_JWT_SECRET, clock });
}

export type TestApp = ReturnType<typeof buildTestApp>;

export async function registerUser(app: TestApp, email = 'ada@example.com'): Promise<string> {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'correct-horse', name: 'Ada' })
    .expect(201);
  return response.body.token as string;
}
