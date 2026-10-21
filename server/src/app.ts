import path from 'node:path';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { authRouter } from './auth/auth.routes.js';
import { AuthService } from './auth/auth.service.js';
import { requireAuth } from './auth/require-auth.js';
import { UsersRepository } from './auth/users.repository.js';
import { BudgetsRepository } from './budgets/budgets.repository.js';
import { budgetsRouter } from './budgets/budgets.routes.js';
import { BudgetsService } from './budgets/budgets.service.js';
import type { Database } from './db/database.js';
import { apiNotFound, errorHandler } from './http/error-handler.js';
import { RecurringRepository } from './recurring/recurring.repository.js';
import { recurringRouter, syncRecurring } from './recurring/recurring.routes.js';
import { RecurringService, type Clock } from './recurring/recurring.service.js';
import { SummaryRepository } from './summary/summary.repository.js';
import { summaryRouter } from './summary/summary.routes.js';
import { SummaryService } from './summary/summary.service.js';
import { TransactionsRepository } from './transactions/transactions.repository.js';
import { transactionsRouter } from './transactions/transactions.routes.js';
import { TransactionsService } from './transactions/transactions.service.js';

export interface AppDependencies {
  db: Database;
  jwtSecret: string;
  clientDistPath?: string | null;
  clock?: Clock;
}

function serveClient(app: Express, distPath: string): void {
  const indexHtml = path.resolve(distPath, 'index.html');
  app.use(express.static(distPath, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(indexHtml);
  });
}

export function createApp({ db, jwtSecret, clientDistPath = null, clock = () => new Date() }: AppDependencies): Express {
  const app = express();
  const auth = new AuthService(new UsersRepository(db), jwtSecret);
  const recurring = new RecurringService(new RecurringRepository(db), clock);
  const authenticatedWithSync = [requireAuth(auth), syncRecurring(recurring)];

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/auth', authRouter(auth));
  app.use('/api/transactions', authenticatedWithSync, transactionsRouter(new TransactionsService(new TransactionsRepository(db))));
  app.use('/api/summary', authenticatedWithSync, summaryRouter(new SummaryService(new SummaryRepository(db))));
  app.use('/api/budgets', authenticatedWithSync, budgetsRouter(new BudgetsService(new BudgetsRepository(db))));
  app.use('/api/recurring', requireAuth(auth), recurringRouter(recurring));
  app.use('/api', apiNotFound);

  if (clientDistPath) serveClient(app, clientDistPath);

  app.use(errorHandler);
  return app;
}
