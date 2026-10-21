import { Link } from 'react-router';
import { useApiQuery } from '../api/useApiQuery';
import { budgetsApi } from './budgets-api';

export function BudgetAlert({ month }: { month: string }) {
  const budgets = useApiQuery(() => budgetsApi.forMonth(month), [month]);
  const over = (budgets.value ?? []).filter((budget) => budget.status === 'over');
  if (over.length === 0) return null;

  const names = over.map((budget) => budget.category).join(', ');
  return (
    <div className="notice notice--error" role="status">
      <p>
        <span aria-hidden="true">▲ </span>
        <strong>{over.length === 1 ? '1 category is' : `${over.length} categories are`} over budget</strong> — {names}
      </p>
      <Link className="text-link" to={`/budgets?month=${month}`}>
        Review budgets →
      </Link>
    </div>
  );
}
