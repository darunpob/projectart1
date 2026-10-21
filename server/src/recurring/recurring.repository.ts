import type { SQLInputValue } from 'node:sqlite';
import type { Database } from '../db/database.js';
import type { TransactionType } from '../transactions/categories.js';

export interface RecurringRule {
  id: number;
  type: TransactionType;
  amountCents: number;
  category: string;
  note: string;
  dayOfMonth: number;
  startMonth: string;
  lastGeneratedMonth: string | null;
  active: boolean;
}

export type RecurringRuleDraft = Omit<RecurringRule, 'id' | 'lastGeneratedMonth'>;

type RecurringRuleRow = {
  id: number;
  type: TransactionType;
  amount_cents: number;
  category: string;
  note: string;
  day_of_month: number;
  start_month: string;
  last_generated_month: string | null;
  active: number;
};

const toRule = (row: RecurringRuleRow): RecurringRule => ({
  id: row.id,
  type: row.type,
  amountCents: row.amount_cents,
  category: row.category,
  note: row.note,
  dayOfMonth: row.day_of_month,
  startMonth: row.start_month,
  lastGeneratedMonth: row.last_generated_month,
  active: row.active === 1,
});

const toParams = (userId: number, rule: RecurringRuleDraft): Record<string, SQLInputValue> => ({
  userId,
  type: rule.type,
  amountCents: rule.amountCents,
  category: rule.category,
  note: rule.note,
  dayOfMonth: rule.dayOfMonth,
  startMonth: rule.startMonth,
  active: rule.active ? 1 : 0,
});

export class RecurringRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  list(userId: number): RecurringRule[] {
    const rows = this.#db
      .prepare('SELECT * FROM recurring_rules WHERE user_id = ? ORDER BY day_of_month, id')
      .all(userId) as RecurringRuleRow[];
    return rows.map(toRule);
  }

  listActive(userId: number): RecurringRule[] {
    const rows = this.#db
      .prepare('SELECT * FROM recurring_rules WHERE user_id = ? AND active = 1')
      .all(userId) as RecurringRuleRow[];
    return rows.map(toRule);
  }

  findById(userId: number, id: number): RecurringRule | null {
    const row = this.#db
      .prepare('SELECT * FROM recurring_rules WHERE id = ? AND user_id = ?')
      .get(id, userId) as RecurringRuleRow | undefined;
    return row ? toRule(row) : null;
  }

  create(userId: number, rule: RecurringRuleDraft): RecurringRule {
    const row = this.#db
      .prepare(
        `INSERT INTO recurring_rules (user_id, type, amount_cents, category, note, day_of_month, start_month, active)
         VALUES (:userId, :type, :amountCents, :category, :note, :dayOfMonth, :startMonth, :active)
         RETURNING *`,
      )
      .get(toParams(userId, rule)) as RecurringRuleRow;
    return toRule(row);
  }

  replace(userId: number, rule: RecurringRule): RecurringRule {
    const row = this.#db
      .prepare(
        `UPDATE recurring_rules
         SET type = :type, amount_cents = :amountCents, category = :category, note = :note,
             day_of_month = :dayOfMonth, start_month = :startMonth, active = :active,
             last_generated_month = :lastGeneratedMonth
         WHERE id = :id AND user_id = :userId
         RETURNING *`,
      )
      .get({ ...toParams(userId, rule), id: rule.id, lastGeneratedMonth: rule.lastGeneratedMonth }) as RecurringRuleRow;
    return toRule(row);
  }

  delete(userId: number, id: number): boolean {
    const outcome = this.#db.prepare('DELETE FROM recurring_rules WHERE id = ? AND user_id = ?').run(id, userId);
    return Number(outcome.changes) > 0;
  }

  recordOccurrences(userId: number, rule: RecurringRule, dates: string[]): number {
    const lastDate = dates[dates.length - 1];
    if (!lastDate) return 0;
    const insert = this.#db.prepare(
      `INSERT OR IGNORE INTO transactions (user_id, type, amount_cents, category, note, occurred_on, recurring_rule_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    this.#db.exec('BEGIN');
    try {
      const inserted = dates.reduce(
        (count, date) =>
          count + Number(insert.run(userId, rule.type, rule.amountCents, rule.category, rule.note, date, rule.id).changes),
        0,
      );
      this.#db
        .prepare('UPDATE recurring_rules SET last_generated_month = ? WHERE id = ?')
        .run(lastDate.slice(0, 7), rule.id);
      this.#db.exec('COMMIT');
      return inserted;
    } catch (cause) {
      this.#db.exec('ROLLBACK');
      throw cause;
    }
  }
}
