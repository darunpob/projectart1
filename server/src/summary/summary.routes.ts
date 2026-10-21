import { Router } from 'express';
import { z } from 'zod';
import { currentUser } from '../auth/require-auth.js';
import { currentMonth } from '../transactions/month.js';
import { monthSchema } from '../transactions/transactions.schemas.js';
import type { SummaryService } from './summary.service.js';

const summaryQuerySchema = z.object({
  month: monthSchema.optional(),
});

export function summaryRouter(service: SummaryService): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const { month = currentMonth() } = summaryQuerySchema.parse(req.query);
    res.json({ summary: service.forMonth(currentUser(res).id, month) });
  });

  return router;
}
