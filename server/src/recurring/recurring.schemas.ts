import { z } from 'zod';
import { TRANSACTION_TYPES } from '../transactions/categories.js';
import { monthSchema } from '../transactions/transactions.schemas.js';

const note = z.string().trim().max(200);

const ruleFields = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amountCents: z.number().int().positive().max(100_000_000_00),
  category: z.string().trim().min(1).max(40),
  note,
  dayOfMonth: z.number().int().min(1).max(31),
  startMonth: monthSchema,
  active: z.boolean(),
});

export const createRecurringSchema = ruleFields.extend({
  note: note.default(''),
  startMonth: monthSchema.optional(),
  active: z.boolean().default(true),
});

export const updateRecurringSchema = ruleFields
  .partial()
  .refine((fields) => Object.keys(fields).length > 0, 'Provide at least one field to update');

export const recurringIdSchema = z.coerce.number().int().positive();

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>;
export type UpdateRecurringInput = z.infer<typeof updateRecurringSchema>;
