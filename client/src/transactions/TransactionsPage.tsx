import { useDeferredValue, useState } from 'react';
import { useApiQuery } from '../api/useApiQuery';
import { MonthSwitcher } from '../layout/MonthSwitcher';
import { StatusPanel } from '../layout/StatusPanel';
import { useMonthParam } from '../months/month';
import { CsvActions } from './CsvActions';
import { Dialog } from './Dialog';
import { TransactionForm } from './TransactionForm';
import { TransactionTable } from './TransactionTable';
import { transactionsApi, type Transaction, type TransactionDraft, type TransactionType } from './transactions-api';

type Editing = { mode: 'create' } | { mode: 'edit'; transaction: Transaction } | null;

export function TransactionsPage() {
  const [month, setMonth] = useMonthParam();
  const [type, setType] = useState<TransactionType | ''>('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [editing, setEditing] = useState<Editing>(null);

  const categories = useApiQuery(() => transactionsApi.categories(), []);
  const listing = useApiQuery(
    () => transactionsApi.list({ month, type: type || undefined, category, search: deferredSearch }),
    [month, type, category, deferredSearch],
  );

  const categoryOptions = categories.value ? (type ? categories.value[type] : [...new Set(Object.values(categories.value).flat())]) : [];

  const save = async (draft: TransactionDraft) => {
    if (editing?.mode === 'edit') await transactionsApi.update(editing.transaction.id, draft);
    else await transactionsApi.create(draft);
    setEditing(null);
    listing.reload();
  };

  const remove = async (transaction: Transaction) => {
    if (!window.confirm(`Delete "${transaction.note || transaction.category}"?`)) return;
    try {
      await transactionsApi.remove(transaction.id);
      listing.reload();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Delete failed');
    }
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Transactions</h1>
          <p className="muted">Every baht in and out, filterable.</p>
        </div>
        <div className="page-header__actions">
          <MonthSwitcher month={month} onChange={setMonth} />
          <button className="button button--primary" type="button" disabled={!categories.value} onClick={() => setEditing({ mode: 'create' })}>
            + Add transaction
          </button>
        </div>
      </header>

      <div className="filter-bar">
        <input className="input" type="search" placeholder="Search notes or categories…" aria-label="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select
          className="input"
          aria-label="Type"
          value={type}
          onChange={(event) => {
            setType(event.target.value as TransactionType | '');
            setCategory('');
          }}
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select className="input" aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categoryOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <CsvActions filters={{ month, type: type || undefined, category, search: deferredSearch }} onImported={listing.reload} />

      <StatusPanel error={listing.error} loading={listing.loading && !listing.value} onRetry={listing.reload} />
      {listing.value && (
        <section className="panel panel--flush">
          <TransactionTable transactions={listing.value} onEdit={(transaction) => setEditing({ mode: 'edit', transaction })} onDelete={remove} />
        </section>
      )}

      <Dialog title={editing?.mode === 'edit' ? 'Edit transaction' : 'New transaction'} open={editing !== null} onClose={() => setEditing(null)}>
        {categories.value && (
          <TransactionForm
            categories={categories.value}
            initial={editing?.mode === 'edit' ? editing.transaction : null}
            submitLabel={editing?.mode === 'edit' ? 'Save changes' : 'Add transaction'}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>
    </>
  );
}
