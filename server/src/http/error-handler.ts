import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError, type ErrorIssue } from './http-error.js';

interface ErrorBody {
  error: { code: string; message: string; issues?: ErrorIssue[] };
}

function isMalformedJson(err: unknown): boolean {
  return err instanceof SyntaxError && 'body' in err;
}

function toErrorResponse(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof ZodError) {
    const issues = err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    return { status: 400, body: { error: { code: 'validation_failed', message: 'Invalid request', issues } } };
  }
  if (err instanceof HttpError) {
    return { status: err.status, body: { error: { code: err.code, message: err.message, issues: err.issues } } };
  }
  if (isMalformedJson(err)) {
    return { status: 400, body: { error: { code: 'malformed_json', message: 'Request body is not valid JSON' } } };
  }
  console.error(err);
  return { status: 500, body: { error: { code: 'internal_error', message: 'Something went wrong' } } };
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const { status, body } = toErrorResponse(err);
  res.status(status).json(body);
};

export const apiNotFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'route_not_found', `No route for ${req.method} ${req.originalUrl}`));
};
