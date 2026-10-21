import express, { Router } from 'express';
import { z } from 'zod';
import { currentUser } from '../auth/require-auth.js';
import { HttpError } from '../http/http-error.js';
import { CATEGORIES } from './categories.js';
import type { TransactionsService } from './transactions.service.js';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  transactionIdSchema,
  updateTransactionSchema,
} from './transactions.schemas.js';

const MAX_EXPORT_ROWS = 10_000;

const exportQuerySchema = listTransactionsQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(MAX_EXPORT_ROWS).default(MAX_EXPORT_ROWS),
});

export function transactionsRouter(service: TransactionsService): Router {
  const router = Router();

  router.get('/categories', (_req, res) => {
    res.json({ categories: CATEGORIES });
  });

  router.get('/', (req, res) => {
    const query = listTransactionsQuerySchema.parse(req.query);
    res.json({ transactions: service.list(currentUser(res).id, query) });
  });

  router.get('/export', (req, res) => {
    const query = exportQuerySchema.parse(req.query);
    const filename = `spendwise-${query.month ?? 'all'}.csv`;
    res
      .type('text/csv; charset=utf-8')
      .attachment(filename)
      .send(service.exportCsv(currentUser(res).id, query));
  });

  router.post('/import', express.text({ type: ['text/csv', 'text/plain'], limit: '1mb' }), (req, res) => {
    if (typeof req.body !== 'string') {
      throw new HttpError(415, 'unsupported_media_type', 'Send the CSV file with Content-Type: text/csv');
    }
    res.status(201).json({ imported: service.importCsv(currentUser(res).id, req.body) });
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
