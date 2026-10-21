import type { RequestHandler, Response } from 'express';
import { HttpError } from '../http/http-error.js';
import type { AuthService } from './auth.service.js';
import type { User } from './users.repository.js';

const BEARER_PREFIX = 'Bearer ';

export function requireAuth(auth: AuthService): RequestHandler {
  return (req, res, next) => {
    const header = req.get('authorization') ?? '';
    if (!header.startsWith(BEARER_PREFIX)) {
      throw new HttpError(401, 'unauthorized', 'Missing bearer token');
    }
    res.locals.user = auth.authenticate(header.slice(BEARER_PREFIX.length));
    next();
  };
}

export function currentUser(res: Response): User {
  const user = res.locals.user as User | undefined;
  if (!user) throw new HttpError(401, 'unauthorized', 'Not authenticated');
  return user;
}
