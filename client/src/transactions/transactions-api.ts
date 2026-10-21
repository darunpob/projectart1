import { apiDownload, apiRequest, jsonBody } from '../api/http';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: number;
  type: TransactionType;
  amountCents: number;
  category: string;
  note: string;
  occurredOn: string;
  createdAt: string;
}

export type TransactionDraft = Pick<Transaction, 'type' | 'amountCents' | 'category' | 'note' | 'occurredOn'>;

export type CategoryCatalogue = Record<TransactionType, string[]>;

export interface TransactionFilters {
  month?: string;
  type?: TransactionType;
  category?: string;
  search?: string;
  limit?: number;
}

function toQueryString(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  for (const [key, filterValue] of Object.entries(filters)) {
    if (filterValue !== undefined && filterValue !== '') params.set(key, String(filterValue));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const transactionsApi = {
  list: (filters: TransactionFilters) =>
    apiRequest<{ transactions: Transaction[] }>(`/transactions${toQueryString(filters)}`).then(
      (response) => response.transactions,
    ),
  categories: () =>
    apiRequest<{ categories: CategoryCatalogue }>('/transactions/categories').then((response) => response.categories),
  create: (draft: TransactionDraft) =>
    apiRequest<{ transaction: Transaction }>('/transactions', { method: 'POST', body: jsonBody(draft) }),
  update: (id: number, draft: Partial<TransactionDraft>) =>
    apiRequest<{ transaction: Transaction }>(`/transactions/${id}`, { method: 'PATCH', body: jsonBody(draft) }),
  remove: (id: number) => apiRequest<void>(`/transactions/${id}`, { method: 'DELETE' }),
  exportCsv: (filters: TransactionFilters) =>
    apiDownload(`/transactions/export${toQueryString(filters)}`, 'spendwise.csv'),
  importCsv: (csvText: string) =>
    apiRequest<{ imported: number }>('/transactions/import', {
      method: 'POST',
      body: csvText,
      headers: { 'Content-Type': 'text/csv' },
    }).then((response) => response.imported),
};
