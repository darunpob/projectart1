import { useState, type FormEvent } from 'react';
import { centsToInput, formatMoney, formatPercent, parseAmountToCents } from '../money/money';
import type { Budget, BudgetStatus } from './budgets-api';

const STATUS_LABEL: Record<BudgetStatus, string> = {
  'on-track': 'On track',
  warning: 'Almost there',
  over: 'Over budget',
};

const STATUS_ICON: Record<BudgetStatus, string> = {
  'on-track': '✓',
  warning: '!',
  over: '▲',
};

interface BudgetCardProps {
  category: string;
  budget: Budget | null;
  onSave: (category: string, limitCents: number) => Promise<void>;
  onRemove: (category: string) => Promise<void>;
}

function BudgetProgress({ budget }: { budget: Budget }) {
  const width = Math.min(budget.usedRatio, 1) * 100;
  const remaining =
    budget.remainingCents >= 0 ? `${formatMoney(budget.remainingCents)} left` : `${formatMoney(-budget.remainingCents)} over`;
  return (
    <>
      <div
        className="budget-track"
        role="progressbar"
        aria-label={`${budget.category} budget used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(budget.usedRatio * 100)}
      >
        <div className={`budget-track__fill budget-track__fill--${budget.status}`} style={{ width: `${width}%` }} />
      </div>
      <div className="budget-card__meta">
        <span>
          <strong>{formatMoney(budget.spentCents)}</strong> <span className="muted">of {formatMoney(budget.limitCents)}</span>
        </span>
        <span className="muted">
          {formatPercent(budget.usedRatio)} · {remaining}
        </span>
      </div>
    </>
  );
}

export function BudgetCard({ category, budget, onSave, onRemove }: BudgetCardProps) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setAmount(budget ? centsToInput(budget.limitCents) : '');
    setError(null);
    setEditing(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const limitCents = parseAmountToCents(amount);
    if (limitCents === null) {
      setError('Enter a positive amount');
      return;
    }
    try {
      await onSave(category, limitCents);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save budget');
    }
  };

  return (
    <article className={`budget-card${budget ? '' : ' budget-card--empty'}`}>
      <header className="budget-card__header">
        <h3>{category}</h3>
        {budget && (
          <span className={`status-chip status-chip--${budget.status}`}>
            <span aria-hidden="true">{STATUS_ICON[budget.status]}</span> {STATUS_LABEL[budget.status]}
          </span>
        )}
      </header>

      {budget && !editing && <BudgetProgress budget={budget} />}

      {editing ? (
        <form className="budget-card__form" onSubmit={submit}>
          <input
            className="input"
            inputMode="decimal"
            placeholder="Monthly limit (฿)"
            aria-label={`Monthly limit for ${category}`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            autoFocus
          />
          <button className="button button--primary button--small" type="submit">
            Save
          </button>
          <button className="button button--ghost button--small" type="button" onClick={() => setEditing(false)}>
            Cancel
          </button>
          {error && (
            <p className="form-error budget-card__error" role="alert">
              {error}
            </p>
          )}
        </form>
      ) : (
        <div className="budget-card__actions">
          <button className="button button--ghost button--small" type="button" onClick={startEditing}>
            {budget ? 'Edit limit' : '+ Set budget'}
          </button>
          {budget && (
            <button className="button button--danger button--small" type="button" onClick={() => onRemove(category)}>
              Remove
            </button>
          )}
        </div>
      )}
    </article>
  );
}
