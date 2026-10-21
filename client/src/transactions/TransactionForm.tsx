import { useState, type FormEvent } from 'react';
import { centsToInput, parseAmountToCents } from '../money/money';
import { todayIso } from '../months/month';
import type { CategoryCatalogue, Transaction, TransactionDraft, TransactionType } from './transactions-api';

interface TransactionFormProps {
  categories: CategoryCatalogue;
  initial?: Transaction | null;
  submitLabel: string;
  onSubmit: (draft: TransactionDraft) => Promise<void>;
  onCancel: () => void;
}

const TYPE_OPTIONS: { type: TransactionType; label: string }[] = [
  { type: 'expense', label: 'Expense' },
  { type: 'income', label: 'Income' },
];

export function TransactionForm({ categories, initial, submitLabel, onSubmit, onCancel }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense');
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amountCents) : '');
  const [category, setCategory] = useState(initial?.category ?? categories.expense[0] ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [occurredOn, setOccurredOn] = useState(initial?.occurredOn ?? todayIso());
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
      await onSubmit({ type, amountCents, category, note: note.trim(), occurredOn });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div className="segmented" role="radiogroup" aria-label="Transaction type">
        {TYPE_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            role="radio"
            aria-checked={type === option.type}
            className={`segmented__option segmented__option--${option.type}`}
            onClick={() => changeType(option.type)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="form-row">
        <label className="field">
          <span>Amount (฿)</span>
          <input inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>Date</span>
          <input type="date" value={occurredOn} max={todayIso()} onChange={(event) => setOccurredOn(event.target.value)} required />
        </label>
      </div>

      <label className="field">
        <span>Category</span>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories[type].map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Note</span>
        <input value={note} maxLength={200} placeholder="Optional" onChange={(event) => setNote(event.target.value)} />
      </label>

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
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
