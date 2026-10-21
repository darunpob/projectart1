export const TRANSACTION_TYPES = ['income', 'expense'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const CATEGORIES: Record<TransactionType, readonly string[]> = {
  income: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'],
  expense: [
    'Food & Dining',
    'Transport',
    'Housing',
    'Utilities',
    'Shopping',
    'Health',
    'Entertainment',
    'Education',
    'Travel',
    'Other',
  ],
};

export function isCategoryAllowed(type: TransactionType, category: string): boolean {
  return CATEGORIES[type].includes(category);
}
