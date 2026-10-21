import type { Database } from '../db/database.js';
import type { DateRange } from '../transactions/month.js';

export type BudgetSpendingRow = { category: string; limitCents: number; spentCents: number };

export class BudgetsRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  listWithSpending(userId: number, range: DateRange): BudgetSpendingRow[] {
    return this.#db
      .prepare(
        `SELECT b.category,
                b.amount_cents AS limitCents,
                COALESCE((
                  SELECT SUM(t.amount_cents) FROM transactions t
                  WHERE t.user_id = b.user_id AND t.type = 'expense' AND t.category = b.category
                    AND t.occurred_on BETWEEN :from AND :to
                ), 0) AS spentCents
         FROM budgets b
         WHERE b.user_id = :userId
         ORDER BY b.category`,
      )
      .all({ userId, ...range }) as BudgetSpendingRow[];
  }

  upsert(userId: number, category: string, limitCents: number): void {
    this.#db
      .prepare(
        `INSERT INTO budgets (user_id, category, amount_cents) VALUES (?, ?, ?)
         ON CONFLICT (user_id, category) DO UPDATE SET amount_cents = excluded.amount_cents`,
      )
      .run(userId, category, limitCents);
  }

  delete(userId: number, category: string): boolean {
    const outcome = this.#db.prepare('DELETE FROM budgets WHERE user_id = ? AND category = ?').run(userId, category);
    return Number(outcome.changes) > 0;
  }
}
