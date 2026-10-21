import type { SQLInputValue } from 'node:sqlite';
import type { Database } from '../db/database.js';
import type { TransactionType } from './categories.js';
import { monthRange } from './month.js';
import type { CreateTransactionInput, ListTransactionsQuery } from './transactions.schemas.js';

export interface Transaction {
  id: number;
  type: TransactionType;
  amountCents: number;
  category: string;
  note: string;
  occurredOn: string;
  createdAt: string;
  recurringRuleId: number | null;
}

type TransactionRow = {
  id: number;
  type: TransactionType;
  amount_cents: number;
  category: string;
  note: string;
  occurred_on: string;
  created_at: string;
  recurring_rule_id: number | null;
};

const SELECT_COLUMNS = 'id, type, amount_cents, category, note, occurred_on, created_at, recurring_rule_id';

const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  type: row.type,
  amountCents: row.amount_cents,
  category: row.category,
  note: row.note,
  occurredOn: row.occurred_on,
  createdAt: row.created_at,
  recurringRuleId: row.recurring_rule_id,
});

const escapeLike = (term: string) => term.replace(/[\\%_]/g, (match) => `\\${match}`);

function buildListFilter(userId: number, query: ListTransactionsQuery) {
  const clauses = ['user_id = :userId'];
  const params: Record<string, SQLInputValue> = { userId, limit: query.limit };

  if (query.month) {
    clauses.push('occurred_on BETWEEN :from AND :to');
    Object.assign(params, monthRange(query.month));
  }
  if (query.type) {
    clauses.push('type = :type');
    params.type = query.type;
  }
  if (query.category) {
    clauses.push('category = :category');
    params.category = query.category;
  }
  if (query.search) {
    clauses.push(String.raw`(note LIKE :search ESCAPE '\' OR category LIKE :search ESCAPE '\')`);
    params.search = `%${escapeLike(query.search)}%`;
  }
  return { where: clauses.join(' AND '), params };
}

export class TransactionsRepository {
  readonly #db: Database;

  constructor(db: Database) {
    this.#db = db;
  }

  list(userId: number, query: ListTransactionsQuery): Transaction[] {
    const { where, params } = buildListFilter(userId, query);
    const rows = this.#db
      .prepare(
        `SELECT ${SELECT_COLUMNS} FROM transactions WHERE ${where}
         ORDER BY occurred_on DESC, id DESC LIMIT :limit`,
      )
      .all(params) as TransactionRow[];
    return rows.map(toTransaction);
  }

  findById(userId: number, id: number): Transaction | null {
    const row = this.#db
      .prepare(`SELECT ${SELECT_COLUMNS} FROM transactions WHERE id = ? AND user_id = ?`)
      .get(id, userId) as TransactionRow | undefined;
    return row ? toTransaction(row) : null;
  }

  create(userId: number, input: CreateTransactionInput): Transaction {
    const row = this.#db
      .prepare(
        `INSERT INTO transactions (user_id, type, amount_cents, category, note, occurred_on)
         VALUES (:userId, :type, :amountCents, :category, :note, :occurredOn)
         RETURNING ${SELECT_COLUMNS}`,
      )
      .get({ userId, ...input }) as TransactionRow;
    return toTransaction(row);
  }

  createMany(userId: number, inputs: CreateTransactionInput[]): number {
    this.#db.exec('BEGIN');
    try {
      for (const input of inputs) this.create(userId, input);
      this.#db.exec('COMMIT');
      return inputs.length;
    } catch (cause) {
      this.#db.exec('ROLLBACK');
      throw cause;
    }
  }

  replace(userId: number, transaction: Transaction): Transaction {
    const row = this.#db
      .prepare(
        `UPDATE transactions
         SET type = :type, amount_cents = :amountCents, category = :category,
             note = :note, occurred_on = :occurredOn
         WHERE id = :id AND user_id = :userId
         RETURNING ${SELECT_COLUMNS}`,
      )
      .get({
        userId,
        id: transaction.id,
        type: transaction.type,
        amountCents: transaction.amountCents,
        category: transaction.category,
        note: transaction.note,
        occurredOn: transaction.occurredOn,
      }) as TransactionRow;
    return toTransaction(row);
  }

  delete(userId: number, id: number): boolean {
    const outcome = this.#db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(id, userId);
    return Number(outcome.changes) > 0;
  }
}
