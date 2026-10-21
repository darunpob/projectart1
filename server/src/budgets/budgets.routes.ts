import { Router } from 'express';
import { z } from 'zod';
import { currentUser } from '../auth/require-auth.js';
import { currentMonth } from '../transactions/month.js';
import { monthSchema } from '../transactions/transactions.schemas.js';
import type { BudgetsService } from './budgets.service.js';

const budgetQuerySchema = z.object({ month: monthSchema.optional() });
const budgetLimitSchema = z.object({ limitCents: z.number().int().positive().max(100_000_000_00) });
const categoryParamSchema = z.string().trim().min(1).max(40);

export function budgetsRouter(service: BudgetsService): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const { month = currentMonth() } = budgetQuerySchema.parse(req.query);
    res.json({ month, budgets: service.forMonth(currentUser(res).id, month) });
  });

  router.put('/:category', (req, res) => {
    const category = categoryParamSchema.parse(req.params.category);
    const { limitCents } = budgetLimitSchema.parse(req.body);
    service.set(currentUser(res).id, category, limitCents);
    res.status(204).end();
  });

  router.delete('/:category', (req, res) => {
    service.remove(currentUser(res).id, categoryParamSchema.parse(req.params.category));
    res.status(204).end();
  });

  return router;
}
