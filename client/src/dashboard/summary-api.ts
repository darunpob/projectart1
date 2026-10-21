import { apiRequest } from '../api/http';

export interface CategoryTotal {
  category: string;
  totalCents: number;
}

export interface MonthTotals {
  month: string;
  incomeCents: number;
  expenseCents: number;
}

export interface MonthlySummary {
  month: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  savingsRate: number | null;
  expenseByCategory: CategoryTotal[];
  trend: MonthTotals[];
}

export const fetchSummary = (month: string) =>
  apiRequest<{ summary: MonthlySummary }>(`/summary?month=${month}`).then((response) => response.summary);
