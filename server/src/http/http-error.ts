export interface ErrorIssue {
  path: string;
  message: string;
}

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: ErrorIssue[] | undefined;

  constructor(status: number, code: string, message: string, issues?: ErrorIssue[]) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

export const notFound = (resource: string) =>
  new HttpError(404, 'not_found', `${resource} not found`);
