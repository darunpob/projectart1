import { apiRequest, jsonBody } from '../api/http';
import type { TransactionType } from '../transactions/transactions-api';

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
  nextOccurrence: string | null;
}

export type RecurringDraft = Pick<RecurringRule, 'type' | 'amountCents' | 'category' | 'note' | 'dayOfMonth' | 'startMonth'>;

export const recurringApi = {
  list: () => apiRequest<{ rules: RecurringRule[] }>('/recurring').then((response) => response.rules),
  create: (draft: RecurringDraft) => apiRequest<unknown>('/recurring', { method: 'POST', body: jsonBody(draft) }),
  update: (id: number, changes: Partial<RecurringDraft & { active: boolean }>) =>
    apiRequest<unknown>(`/recurring/${id}`, { method: 'PATCH', body: jsonBody(changes) }),
  remove: (id: number) => apiRequest<void>(`/recurring/${id}`, { method: 'DELETE' }),
};
