import { Router } from 'express';
import { loginSchema, registerSchema } from './auth.schemas.js';
import type { AuthService } from './auth.service.js';
import { currentUser, requireAuth } from './require-auth.js';

export function authRouter(auth: AuthService): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    const session = await auth.register(registerSchema.parse(req.body));
    res.status(201).json(session);
  });

  router.post('/login', async (req, res) => {
    const session = await auth.login(loginSchema.parse(req.body));
    res.json(session);
  });

  router.get('/me', requireAuth(auth), (_req, res) => {
    res.json({ user: currentUser(res) });
  });

  return router;
}
