import type { Database } from '../db/database.js';
import type { DateRange } from '../transactions/month.js';

export type CategoryTotalRow = { category: string; totalCents: number };
export type MonthTotalsRow = { month: string; incomeCents: number; expenseCents: number };

export class SummaryRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  expenseByCategory(userId: number, range: DateRange): CategoryTotalRow[] {
    return this.#db
      .prepare(
        `SELECT category, SUM(amount_cents) AS totalCents
         FROM transactions
         WHERE user_id = :userId AND type = 'expense' AND occurred_on BETWEEN :from AND :to
         GROUP BY category
         ORDER BY totalCents DESC`,
      )
      .all({ userId, ...range }) as CategoryTotalRow[];
  }

  totalsByMonth(userId: number, range: DateRange): MonthTotalsRow[] {
    return this.#db
      .prepare(
        `SELECT substr(occurred_on, 1, 7) AS month,
                SUM(CASE WHEN type = 'income' THEN amount_cents ELSE 0 END) AS incomeCents,
                SUM(CASE WHEN type = 'expense' THEN amount_cents ELSE 0 END) AS expenseCents
         FROM transactions
         WHERE user_id = :userId AND occurred_on BETWEEN :from AND :to
         GROUP BY month
         ORDER BY month`,
      )
      .all({ userId, ...range }) as MonthTotalsRow[];
  }
}
