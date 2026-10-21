import { readToken } from '../auth/token-storage';

export interface ApiIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: ApiIssue[];

  constructor(status: number, code: string, message: string, issues: ApiIssue[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

type UnauthorizedListener = () => void;
let onUnauthorized: UnauthorizedListener | null = null;

export function setUnauthorizedListener(listener: UnauthorizedListener | null): void {
  onUnauthorized = listener;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; issues?: ApiIssue[] };
}

async function toApiError(response: Response): Promise<ApiError> {
  const envelope = (await response.json().catch(() => ({}))) as ErrorEnvelope;
  const { code = 'http_error', message = response.statusText, issues = [] } = envelope.error ?? {};
  return new ApiError(response.status, code, message, issues);
}

async function send(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = readToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(`/api${path}`, { ...init, headers });
  if (response.status === 401 && token) onUnauthorized?.();
  if (!response.ok) throw await toApiError(response);
  return response;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await send(path, init);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function apiDownload(path: string, fallbackName: string): Promise<void> {
  const response = await send(path, {});
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const anchor = Object.assign(document.createElement('a'), { href: url, download: filename });
  anchor.click();
  URL.revokeObjectURL(url);
}

export const jsonBody = (body: unknown): RequestInit['body'] => JSON.stringify(body);
