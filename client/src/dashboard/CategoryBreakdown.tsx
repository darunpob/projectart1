import { formatMoney, formatPercent } from '../money/money';
import type { CategoryTotal } from './summary-api';

const MAX_ROWS = 6;

function foldIntoOther(totals: CategoryTotal[]): CategoryTotal[] {
  if (totals.length <= MAX_ROWS) return totals;
  const head = totals.slice(0, MAX_ROWS - 1);
  const otherCents = totals.slice(MAX_ROWS - 1).reduce((sum, entry) => sum + entry.totalCents, 0);
  return [...head, { category: 'Everything else', totalCents: otherCents }];
}

export function CategoryBreakdown({ totals }: { totals: CategoryTotal[] }) {
  if (totals.length === 0) {
    return <p className="empty-state">No expenses recorded this month.</p>;
  }
  const grandTotal = totals.reduce((sum, entry) => sum + entry.totalCents, 0);
  const rows = foldIntoOther(totals);
  const largest = rows[0]?.totalCents ?? 1;

  return (
    <ul className="breakdown" aria-label="Expenses by category">
      {rows.map((entry) => (
        <li key={entry.category} className="breakdown__row" title={`${entry.category}: ${formatMoney(entry.totalCents)}`}>
          <div className="breakdown__labels">
            <span>{entry.category}</span>
            <span className="breakdown__figure">
              {formatMoney(entry.totalCents)}
              <span className="muted"> · {formatPercent(entry.totalCents / grandTotal)}</span>
            </span>
          </div>
          <div className="breakdown__track">
            <div className="breakdown__bar" style={{ width: `${(entry.totalCents / largest) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
