import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: '◧' },
  { to: '/transactions', label: 'Transactions', icon: '≡' },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const { search } = useLocation();
  const initials = (user?.name ?? '?').slice(0, 1).toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          Spendwise
        </div>
        <nav className="nav" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={{ pathname: link.to, search }} end className="nav__link">
              <span aria-hidden="true" className="nav__icon">
                {link.icon}
              </span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__footer">
          <span className="avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="sidebar__user">
            <strong>{user?.name}</strong>
            <span className="muted">{user?.email}</span>
          </div>
          <button className="button button--ghost button--small" type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
