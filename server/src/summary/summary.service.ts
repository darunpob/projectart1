import { monthRange, shiftMonth } from '../transactions/month.js';
import type { CategoryTotalRow, MonthTotalsRow, SummaryRepository } from './summary.repository.js';

export const TREND_MONTHS = 6;

export interface MonthlySummary {
  month: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  savingsRate: number | null;
  expenseByCategory: CategoryTotalRow[];
  trend: MonthTotalsRow[];
}

function fillTrend(rows: MonthTotalsRow[], lastMonth: string): MonthTotalsRow[] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return Array.from({ length: TREND_MONTHS }, (_, index) => {
    const month = shiftMonth(lastMonth, index - (TREND_MONTHS - 1));
    return byMonth.get(month) ?? { month, incomeCents: 0, expenseCents: 0 };
  });
}

export class SummaryService {
  readonly #repository: SummaryRepository;

  constructor(repository: SummaryRepository) {
    this.#repository = repository;
  }

  forMonth(userId: number, month: string): MonthlySummary {
    const trendRange = {
      from: monthRange(shiftMonth(month, -(TREND_MONTHS - 1))).from,
      to: monthRange(month).to,
    };
    const trend = fillTrend(this.#repository.totalsByMonth(userId, trendRange), month);
    const selected = trend[trend.length - 1] ?? { month, incomeCents: 0, expenseCents: 0 };
    const balanceCents = selected.incomeCents - selected.expenseCents;

    return {
      month,
      incomeCents: selected.incomeCents,
      expenseCents: selected.expenseCents,
      balanceCents,
      savingsRate: selected.incomeCents > 0 ? balanceCents / selected.incomeCents : null,
      expenseByCategory: this.#repository.expenseByCategory(userId, monthRange(month)),
      trend,
    };
  }
}
