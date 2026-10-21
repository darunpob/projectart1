import bcrypt from 'bcryptjs';
import { loadConfig } from '../src/config.js';
import { openDatabase, type Database } from '../src/db/database.js';
import { currentMonth, shiftMonth } from '../src/transactions/month.js';

export const DEMO_EMAIL = 'demo@spendwise.dev';
export const DEMO_PASSWORD = 'demo1234';
const MONTHS_OF_HISTORY = 6;

interface RecurringEntry {
  type: 'income' | 'expense';
  category: string;
  note: string;
  day: number;
  baseCents: number;
  jitter: number;
}

const MONTHLY_PATTERN: RecurringEntry[] = [
  { type: 'income', category: 'Salary', note: 'Monthly salary', day: 1, baseCents: 6_500_000, jitter: 0 },
  { type: 'income', category: 'Freelance', note: 'Landing page project', day: 18, baseCents: 1_200_000, jitter: 0.6 },
  { type: 'expense', category: 'Housing', note: 'Condo rent', day: 2, baseCents: 1_500_000, jitter: 0 },
  { type: 'expense', category: 'Utilities', note: 'Electricity & internet', day: 6, baseCents: 220_000, jitter: 0.25 },
  { type: 'expense', category: 'Food & Dining', note: 'Groceries', day: 4, baseCents: 320_000, jitter: 0.3 },
  { type: 'expense', category: 'Food & Dining', note: 'Dinner with friends', day: 14, baseCents: 180_000, jitter: 0.5 },
  { type: 'expense', category: 'Food & Dining', note: 'Groceries', day: 21, baseCents: 290_000, jitter: 0.3 },
  { type: 'expense', category: 'Transport', note: 'BTS top-up', day: 3, baseCents: 150_000, jitter: 0.1 },
  { type: 'expense', category: 'Transport', note: 'Grab rides', day: 16, baseCents: 90_000, jitter: 0.6 },
  { type: 'expense', category: 'Shopping', note: 'Clothes & home', day: 11, baseCents: 260_000, jitter: 0.8 },
  { type: 'expense', category: 'Entertainment', note: 'Streaming & movies', day: 9, baseCents: 75_000, jitter: 0.4 },
  { type: 'expense', category: 'Health', note: 'Gym membership', day: 5, baseCents: 120_000, jitter: 0 },
  { type: 'expense', category: 'Education', note: 'Online course', day: 24, baseCents: 99_000, jitter: 0.5 },
];

const DEMO_BUDGETS: [category: string, limitCents: number][] = [
  ['Food & Dining', 1_000_000],
  ['Shopping', 250_000],
  ['Transport', 400_000],
  ['Entertainment', 90_000],
  ['Housing', 1_600_000],
];

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

function resetDemoUser(db: Database): number {
  db.prepare('DELETE FROM users WHERE email = ?').run(DEMO_EMAIL);
  const created = db
    .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?) RETURNING id')
    .get(DEMO_EMAIL, 'Demo User', bcrypt.hashSync(DEMO_PASSWORD, 10)) as { id: number };
  return created.id;
}

export function seedDemoData(db: Database, now: Date = new Date()): number {
  const userId = resetDemoUser(db);
  const random = seededRandom(42);
  const today = now.toISOString().slice(0, 10);
  const insert = db.prepare(
    `INSERT INTO transactions (user_id, type, amount_cents, category, note, occurred_on)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  const insertBudget = db.prepare('INSERT INTO budgets (user_id, category, amount_cents) VALUES (?, ?, ?)');
  for (const [category, limitCents] of DEMO_BUDGETS) insertBudget.run(userId, category, limitCents);

  let inserted = 0;
  for (let offset = MONTHS_OF_HISTORY - 1; offset >= 0; offset -= 1) {
    const month = shiftMonth(currentMonth(now), -offset);
    for (const entry of MONTHLY_PATTERN) {
      const occurredOn = `${month}-${String(entry.day).padStart(2, '0')}`;
      if (occurredOn > today) continue;
      const amount = Math.round(entry.baseCents * (1 + (random() * 2 - 1) * entry.jitter));
      insert.run(userId, entry.type, Math.max(amount, 100), entry.category, entry.note, occurredOn);
      inserted += 1;
    }
  }
  return inserted;
}

const isEntrypoint = process.argv[1]?.replace(/\\/g, '/').endsWith('fixtures/demo-seed.ts');

if (isEntrypoint) {
  const db = openDatabase(loadConfig().databasePath);
  const count = seedDemoData(db);
  db.close();
  console.log(`Seeded ${count} transactions for ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}
