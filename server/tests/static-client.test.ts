import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/database.js';

describe('static client hosting', () => {
  const distDir = mkdtempSync(path.join(tmpdir(), 'spendwise-dist-'));
  writeFileSync(path.join(distDir, 'index.html'), '<div id="root"></div>');
  const relativeDist = path.relative(process.cwd(), distDir);
  const app = createApp({ db: openDatabase(':memory:'), jwtSecret: 'test', clientDistPath: relativeDist });

  afterAll(() => rmSync(distDir, { recursive: true, force: true }));

  it('serves index.html for client-side routes from a relative dist path', async () => {
    const page = await request(app).get('/transactions').expect(200);
    expect(page.text).toContain('id="root"');
  });

  it('keeps unknown API routes as JSON 404s', async () => {
    const missing = await request(app).get('/api/nope').expect(404);
    expect(missing.body.error.code).toBe('route_not_found');
  });
});
