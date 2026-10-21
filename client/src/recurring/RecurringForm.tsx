import { useState, type FormEvent } from 'react';
import { centsToInput, parseAmountToCents } from '../money/money';
import { currentMonth } from '../months/month';
import type { CategoryCatalogue, TransactionType } from '../transactions/transactions-api';
import type { RecurringDraft, RecurringRule } from './recurring-api';

interface RecurringFormProps {
  categories: CategoryCatalogue;
  initial?: RecurringRule | null;
  onSubmit: (draft: RecurringDraft) => Promise<void>;
  onCancel: () => void;
}

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

const ORDINAL_SUFFIXES: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };

export function ordinalDay(day: number): string {
  const isTeen = day >= 11 && day <= 13;
  return `${day}${isTeen ? 'th' : (ORDINAL_SUFFIXES[day % 10] ?? 'th')}`;
}

export function RecurringForm({ categories, initial, onSubmit, onCancel }: RecurringFormProps) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amountCents) : '');
  const [category, setCategory] = useState(initial?.category ?? categories.expense[0] ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [dayOfMonth, setDayOfMonth] = useState(initial?.dayOfMonth ?? 1);
  const [startMonth, setStartMonth] = useState(initial?.startMonth ?? currentMonth());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const changeType = (next: TransactionType) => {
    setType(next);
    if (!categories[next].includes(category)) setCategory(categories[next][0] ?? '');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      setError('Enter a positive amount with up to two decimals.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ type, amountCents, category, note: note.trim(), dayOfMonth, startMonth });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the rule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div className="segmented" role="radiogroup" aria-label="Transaction type">
        {(['expense', 'income'] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={type === option}
            className={`segmented__option segmented__option--${option}`}
            onClick={() => changeType(option)}
          >
            {option === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      <div className="form-row">
        <label className="field">
          <span>Amount (฿)</span>
          <input inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories[type].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-row">
        <label className="field">
          <span>Repeats on</span>
          <select value={dayOfMonth} onChange={(event) => setDayOfMonth(Number(event.target.value))}>
            {DAYS.map((day) => (
              <option key={day} value={day}>
                {ordinalDay(day)} of each month
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Starting</span>
          <input type="month" value={startMonth} onChange={(event) => setStartMonth(event.target.value)} required />
        </label>
      </div>

      <label className="field">
        <span>Note</span>
        <input value={note} maxLength={200} placeholder="e.g. Netflix, rent, salary" onChange={(event) => setNote(event.target.value)} />
      </label>

      {dayOfMonth > 28 && <p className="muted form-hint">In shorter months this runs on the last day of the month.</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        <button className="button button--ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
        <button className="button button--primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create rule'}
        </button>
      </div>
    </form>
  );
}
