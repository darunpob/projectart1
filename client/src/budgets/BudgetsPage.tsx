import { useApiQuery } from '../api/useApiQuery';
import { MonthSwitcher } from '../layout/MonthSwitcher';
import { StatusPanel } from '../layout/StatusPanel';
import { formatMoney } from '../money/money';
import { useMonthParam } from '../months/month';
import { transactionsApi } from '../transactions/transactions-api';
import { BudgetCard } from './BudgetCard';
import { budgetsApi } from './budgets-api';

export function BudgetsPage() {
  const [month, setMonth] = useMonthParam();
  const categories = useApiQuery(() => transactionsApi.categories(), []);
  const budgets = useApiQuery(() => budgetsApi.forMonth(month), [month]);

  const byCategory = new Map((budgets.value ?? []).map((budget) => [budget.category, budget]));
  const totalLimit = (budgets.value ?? []).reduce((sum, budget) => sum + budget.limitCents, 0);
  const totalSpent = (budgets.value ?? []).reduce((sum, budget) => sum + budget.spentCents, 0);
  const overCount = (budgets.value ?? []).filter((budget) => budget.status === 'over').length;

  const save = async (category: string, limitCents: number) => {
    await budgetsApi.set(category, limitCents);
    budgets.reload();
  };

  const remove = async (category: string) => {
    if (!window.confirm(`Remove the ${category} budget?`)) return;
    try {
      await budgetsApi.remove(category);
      budgets.reload();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Could not remove budget');
    }
  };

  const loadError = categories.error ?? budgets.error;
  const expenseCategories = categories.value?.expense;
  const ready = Boolean(expenseCategories && budgets.value);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Budgets</h1>
          <p className="muted">
            {ready && totalLimit > 0
              ? `${formatMoney(totalSpent)} spent of ${formatMoney(totalLimit)} budgeted${overCount ? ` · ${overCount} over` : ''}`
              : 'Set a monthly limit per category and track it as you spend.'}
          </p>
        </div>
        <MonthSwitcher month={month} onChange={setMonth} />
      </header>

      <StatusPanel
        error={loadError}
        loading={!ready && !loadError}
        onRetry={() => {
          categories.reload();
          budgets.reload();
        }}
      />

      {ready && expenseCategories && (
        <section className="budget-grid" aria-label="Category budgets">
          {expenseCategories.map((category) => (
            <BudgetCard key={category} category={category} budget={byCategory.get(category) ?? null} onSave={save} onRemove={remove} />
          ))}
        </section>
      )}
    </>
  );
}
