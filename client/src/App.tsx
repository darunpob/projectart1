import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AuthPage } from './auth/AuthPage';
import { BudgetsPage } from './budgets/BudgetsPage';
import { DashboardPage } from './dashboard/DashboardPage';
import { AppShell } from './layout/AppShell';
import { TransactionsPage } from './transactions/TransactionsPage';

function RequireSession({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'checking') {
    return (
      <div className="splash" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
      </div>
    );
  }
  if (status === 'signed-out') return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route
            element={
              <RequireSession>
                <AppShell />
              </RequireSession>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="budgets" element={<BudgetsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
