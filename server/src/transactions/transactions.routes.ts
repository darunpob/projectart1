import { Router } from 'express';
import { currentUser } from '../auth/require-auth.js';
import { CATEGORIES } from './categories.js';
import type { TransactionsService } from './transactions.service.js';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  transactionIdSchema,
  updateTransactionSchema,
} from './transactions.schemas.js';

export function transactionsRouter(service: TransactionsService): Router {
  const router = Router();

  router.get('/categories', (_req, res) => {
    res.json({ categories: CATEGORIES });
  });

  router.get('/', (req, res) => {
    const query = listTransactionsQuerySchema.parse(req.query);
    res.json({ transactions: service.list(currentUser(res).id, query) });
  });

  router.post('/', (req, res) => {
    const transaction = service.create(currentUser(res).id, createTransactionSchema.parse(req.body));
    res.status(201).json({ transaction });
  });

  router.patch('/:id', (req, res) => {
    const id = transactionIdSchema.parse(req.params.id);
    const transaction = service.update(currentUser(res).id, id, updateTransactionSchema.parse(req.body));
    res.json({ transaction });
  });

  router.delete('/:id', (req, res) => {
    service.delete(currentUser(res).id, transactionIdSchema.parse(req.params.id));
    res.status(204).end();
  });

  return router;
}
