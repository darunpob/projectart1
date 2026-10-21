import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { ApiError } from '../api/http';
import { useAuth } from './AuthContext';

type AuthMode = 'login' | 'register';

const COPY: Record<AuthMode, { title: string; subtitle: string; submit: string; switchText: string; switchLink: string; switchTo: string }> = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to see where your money went.',
    submit: 'Sign in',
    switchText: 'New to Spendwise?',
    switchLink: 'Create an account',
    switchTo: '/register',
  },
  register: {
    title: 'Create your account',
    subtitle: 'Start tracking income and expenses in seconds.',
    submit: 'Create account',
    switchText: 'Already have an account?',
    switchLink: 'Sign in',
    switchTo: '/login',
  },
};

const DEMO_CREDENTIALS = { email: 'demo@spendwise.dev', password: 'demo1234' };

function describeError(cause: unknown): string {
  if (!(cause instanceof ApiError)) return 'Could not reach the server. Is the API running?';
  const firstIssue = cause.issues[0];
  return firstIssue ? `${firstIssue.path}: ${firstIssue.message}` : cause.message;
}

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { status, login, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = COPY[mode];

  if (status === 'signed-in') return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') await login({ email, password });
      else await register({ name, email, password });
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
  };

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <div className="brand brand--large">
          <span className="brand__mark" aria-hidden="true" />
          Spendwise
        </div>
        <h1>{copy.title}</h1>
        <p className="muted">{copy.subtitle}</p>

        <form className="stack" onSubmit={submit} noValidate>
          {mode === 'register' && (
            <label className="field">
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button button--primary button--block" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : copy.submit}
          </button>
          {mode === 'login' && (
            <button className="button button--ghost button--block" type="button" onClick={fillDemo}>
              Use demo account
            </button>
          )}
        </form>

        <p className="muted auth-switch">
          {copy.switchText} <Link to={copy.switchTo}>{copy.switchLink}</Link>
        </p>
      </section>
    </main>
  );
}
