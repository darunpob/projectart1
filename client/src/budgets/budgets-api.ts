import { apiRequest, jsonBody } from '../api/http';

export type BudgetStatus = 'on-track' | 'warning' | 'over';

export interface Budget {
  category: string;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  usedRatio: number;
  status: BudgetStatus;
}

const categoryPath = (category: string) => `/budgets/${encodeURIComponent(category)}`;

export const budgetsApi = {
  forMonth: (month: string) =>
    apiRequest<{ budgets: Budget[] }>(`/budgets?month=${month}`).then((response) => response.budgets),
  set: (category: string, limitCents: number) =>
    apiRequest<void>(categoryPath(category), { method: 'PUT', body: jsonBody({ limitCents }) }),
  remove: (category: string) => apiRequest<void>(categoryPath(category), { method: 'DELETE' }),
};
