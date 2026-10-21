import { apiRequest, jsonBody } from '../api/http';

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface Session {
  token: string;
  user: User;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface Registration extends Credentials {
  name: string;
}

export const authApi = {
  login: (credentials: Credentials) =>
    apiRequest<Session>('/auth/login', { method: 'POST', body: jsonBody(credentials) }),
  register: (registration: Registration) =>
    apiRequest<Session>('/auth/register', { method: 'POST', body: jsonBody(registration) }),
  me: () => apiRequest<{ user: User }>('/auth/me'),
};
