import { Router, type RequestHandler } from 'express';
import { currentUser } from '../auth/require-auth.js';
import type { RecurringService } from './recurring.service.js';
import { createRecurringSchema, recurringIdSchema, updateRecurringSchema } from './recurring.schemas.js';

export function syncRecurring(service: RecurringService): RequestHandler {
  return (_req, res, next) => {
    service.sync(currentUser(res).id);
    next();
  };
}

export function recurringRouter(service: RecurringService): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ rules: service.list(currentUser(res).id) });
  });

  router.post('/', (req, res) => {
    const rule = service.create(currentUser(res).id, createRecurringSchema.parse(req.body));
    res.status(201).json({ rule });
  });

  router.patch('/:id', (req, res) => {
    const id = recurringIdSchema.parse(req.params.id);
    const rule = service.update(currentUser(res).id, id, updateRecurringSchema.parse(req.body));
    res.json({ rule });
  });

  router.delete('/:id', (req, res) => {
    service.delete(currentUser(res).id, recurringIdSchema.parse(req.params.id));
    res.status(204).end();
  });

  return router;
}
