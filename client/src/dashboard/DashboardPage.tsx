import { Link } from 'react-router';
import { useApiQuery } from '../api/useApiQuery';
import { useAuth } from '../auth/AuthContext';
import { MonthSwitcher } from '../layout/MonthSwitcher';
import { StatusPanel } from '../layout/StatusPanel';
import { formatMoney, formatPercent } from '../money/money';
import { formatMonthLong, useMonthParam } from '../months/month';
import { TransactionTable } from '../transactions/TransactionTable';
import { transactionsApi } from '../transactions/transactions-api';
import { CategoryBreakdown } from './CategoryBreakdown';
import { StatTile } from './StatTile';
import { fetchSummary } from './summary-api';
import { TrendChart } from './TrendChart';

const RECENT_COUNT = 5;

export function DashboardPage() {
  const { user } = useAuth();
  const [month, setMonth] = useMonthParam();
  const summary = useApiQuery(() => fetchSummary(month), [month]);
  const recent = useApiQuery(() => transactionsApi.list({ month, limit: RECENT_COUNT }), [month]);
  const overview = summary.value;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Hi, {user?.name.split(' ')[0]}</h1>
          <p className="muted">Here’s how {formatMonthLong(month)} is going.</p>
        </div>
        <MonthSwitcher month={month} onChange={setMonth} />
      </header>

      <StatusPanel error={summary.error} loading={summary.loading && !overview} onRetry={summary.reload} />

      {overview && (
        <>
          <section className="stat-grid" aria-label="Monthly totals">
            <StatTile label="Income" figure={formatMoney(overview.incomeCents)} tone="income" />
            <StatTile label="Expenses" figure={formatMoney(overview.expenseCents)} tone="expense" />
            <StatTile label="Net balance" figure={formatMoney(overview.balanceCents)} caption={overview.balanceCents >= 0 ? 'Saved this month' : 'Overspent this month'} />
            <StatTile
              label="Savings rate"
              figure={overview.savingsRate === null ? '—' : formatPercent(overview.savingsRate)}
              caption={overview.savingsRate === null ? 'No income yet' : 'of income kept'}
            />
          </section>

          <div className="dashboard-grid">
            <section className="panel">
              <h2 className="panel__title">Income vs expenses · last 6 months</h2>
              <TrendChart trend={overview.trend} selectedMonth={month} />
            </section>
            <section className="panel">
              <h2 className="panel__title">Where the money went</h2>
              <CategoryBreakdown totals={overview.expenseByCategory} />
            </section>
          </div>
        </>
      )}

      <section className="panel panel--flush">
        <div className="panel__header">
          <h2 className="panel__title">Recent transactions</h2>
          <Link className="text-link" to={`/transactions?month=${month}`}>
            View all →
          </Link>
        </div>
        {recent.value && <TransactionTable transactions={recent.value} />}
      </section>
    </>
  );
}
