import { HttpError, notFound } from '../http/http-error.js';
import { isCategoryAllowed } from '../transactions/categories.js';
import { monthRange } from '../transactions/month.js';
import type { BudgetSpendingRow, BudgetsRepository } from './budgets.repository.js';

export const WARNING_RATIO = 0.8;

export type BudgetStatus = 'on-track' | 'warning' | 'over';

export interface Budget extends BudgetSpendingRow {
  usedRatio: number;
  remainingCents: number;
  status: BudgetStatus;
}

export function classifyBudget(row: BudgetSpendingRow): Budget {
  const usedRatio = row.spentCents / row.limitCents;
  const status: BudgetStatus = usedRatio > 1 ? 'over' : usedRatio >= WARNING_RATIO ? 'warning' : 'on-track';
  return { ...row, usedRatio, remainingCents: row.limitCents - row.spentCents, status };
}

function assertExpenseCategory(category: string): void {
  if (isCategoryAllowed('expense', category)) return;
  throw new HttpError(400, 'invalid_category', `"${category}" is not an expense category`);
}

export class BudgetsService {
  readonly #repository: BudgetsRepository;

  constructor(repository: BudgetsRepository) {
    this.#repository = repository;
  }

  forMonth(userId: number, month: string): Budget[] {
    return this.#repository.listWithSpending(userId, monthRange(month)).map(classifyBudget);
  }

  set(userId: number, category: string, limitCents: number): void {
    assertExpenseCategory(category);
    this.#repository.upsert(userId, category, limitCents);
  }

  remove(userId: number, category: string): void {
    if (!this.#repository.delete(userId, category)) throw notFound('Budget');
  }
}
