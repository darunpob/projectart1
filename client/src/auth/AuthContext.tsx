import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setUnauthorizedListener } from '../api/http';
import { authApi, type Credentials, type Registration, type Session, type User } from './auth-api';
import { readToken, writeToken } from './token-storage';

type AuthStatus = 'checking' | 'signed-in' | 'signed-out';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (credentials: Credentials) => Promise<void>;
  register: (registration: Registration) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (readToken() ? 'checking' : 'signed-out'));

  const logout = useCallback(() => {
    writeToken(null);
    setUser(null);
    setStatus('signed-out');
  }, []);

  const startSession = useCallback((session: Session) => {
    writeToken(session.token);
    setUser(session.user);
    setStatus('signed-in');
  }, []);

  useEffect(() => {
    setUnauthorizedListener(logout);
    return () => setUnauthorizedListener(null);
  }, [logout]);

  useEffect(() => {
    if (status !== 'checking') return;
    authApi
      .me()
      .then(({ user: restored }) => {
        setUser(restored);
        setStatus('signed-in');
      })
      .catch((cause: unknown) => {
        console.warn('Stored session rejected', cause);
        logout();
      });
  }, [status, logout]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      logout,
      login: async (credentials) => startSession(await authApi.login(credentials)),
      register: async (registration) => startSession(await authApi.register(registration)),
    }),
    [status, user, logout, startSession],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
