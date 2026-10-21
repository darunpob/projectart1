import { HttpError, notFound } from '../http/http-error.js';
import { isCategoryAllowed, type TransactionType } from '../transactions/categories.js';
import { currentMonth, todayIso } from '../transactions/month.js';
import type { RecurringRepository, RecurringRule } from './recurring.repository.js';
import { dueOccurrences, latestElapsedMonth, nextOccurrence } from './recurring.schedule.js';
import type { CreateRecurringInput, UpdateRecurringInput } from './recurring.schemas.js';

export type Clock = () => Date;

export interface RecurringRuleView extends RecurringRule {
  nextOccurrence: string | null;
}

function assertCategoryAllowed(type: TransactionType, category: string): void {
  if (isCategoryAllowed(type, category)) return;
  throw new HttpError(400, 'invalid_category', `"${category}" is not a valid ${type} category`);
}

export class RecurringService {
  readonly #repository: RecurringRepository;
  readonly #clock: Clock;

  constructor(repository: RecurringRepository, clock: Clock) {
    this.#repository = repository;
    this.#clock = clock;
  }

  list(userId: number): RecurringRuleView[] {
    this.sync(userId);
    const today = todayIso(this.#clock());
    return this.#repository.list(userId).map((rule) => ({
      ...rule,
      nextOccurrence: rule.active ? nextOccurrence(rule, today) : null,
    }));
  }

  create(userId: number, input: CreateRecurringInput): RecurringRule {
    assertCategoryAllowed(input.type, input.category);
    const rule = this.#repository.create(userId, {
      ...input,
      startMonth: input.startMonth ?? currentMonth(this.#clock()),
    });
    this.sync(userId);
    return rule;
  }

  update(userId: number, id: number, changes: UpdateRecurringInput): RecurringRule {
    const existing = this.#repository.findById(userId, id);
    if (!existing) throw notFound('Recurring rule');
    const merged: RecurringRule = { ...existing, ...changes };
    assertCategoryAllowed(merged.type, merged.category);
    if (!existing.active && merged.active) {
      merged.lastGeneratedMonth = latestElapsedMonth(merged.dayOfMonth, todayIso(this.#clock()));
    }
    return this.#repository.replace(userId, merged);
  }

  delete(userId: number, id: number): void {
    if (!this.#repository.delete(userId, id)) throw notFound('Recurring rule');
  }

  sync(userId: number): number {
    const today = todayIso(this.#clock());
    return this.#repository
      .listActive(userId)
      .reduce((count, rule) => count + this.#repository.recordOccurrences(userId, rule, dueOccurrences(rule, today)), 0);
  }
}
