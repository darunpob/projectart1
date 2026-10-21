import { HttpError, notFound } from '../http/http-error.js';
import { isCategoryAllowed, type TransactionType } from './categories.js';
import type { Transaction, TransactionsRepository } from './transactions.repository.js';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from './transactions.schemas.js';

function assertCategoryAllowed(type: TransactionType, category: string): void {
  if (isCategoryAllowed(type, category)) return;
  throw new HttpError(400, 'invalid_category', `"${category}" is not a valid ${type} category`);
}

export class TransactionsService {
  readonly #repository: TransactionsRepository;

  constructor(repository: TransactionsRepository) {
    this.#repository = repository;
  }

  list(userId: number, query: ListTransactionsQuery): Transaction[] {
    return this.#repository.list(userId, query);
  }

  create(userId: number, input: CreateTransactionInput): Transaction {
    assertCategoryAllowed(input.type, input.category);
    return this.#repository.create(userId, input);
  }

  update(userId: number, id: number, changes: UpdateTransactionInput): Transaction {
    const existing = this.#repository.findById(userId, id);
    if (!existing) throw notFound('Transaction');

    const merged: Transaction = { ...existing, ...changes };
    assertCategoryAllowed(merged.type, merged.category);
    return this.#repository.replace(userId, merged);
  }

  delete(userId: number, id: number): void {
    if (!this.#repository.delete(userId, id)) throw notFound('Transaction');
  }
}
