import { z } from 'zod';
import { MONTH_PATTERN } from './month.js';
import { TRANSACTION_TYPES } from './categories.js';

const MAX_AMOUNT_CENTS = 100_000_000_00;

const note = z.string().trim().max(200);

const transactionFields = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amountCents: z.number().int().positive().max(MAX_AMOUNT_CENTS),
  category: z.string().trim().min(1).max(40),
  note,
  occurredOn: z.iso.date(),
});

export const createTransactionSchema = transactionFields.extend({ note: note.default('') });

export const updateTransactionSchema = transactionFields
  .partial()
  .refine((fields) => Object.keys(fields).length > 0, 'Provide at least one field to update');

export const transactionIdSchema = z.coerce.number().int().positive();

export const monthSchema = z.string().regex(MONTH_PATTERN, 'Expected month as YYYY-MM');

export const listTransactionsQuerySchema = z.object({
  month: monthSchema.optional(),
  type: z.enum(TRANSACTION_TYPES).optional(),
  category: z.string().trim().min(1).max(40).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
