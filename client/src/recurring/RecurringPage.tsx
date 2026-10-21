import { useState } from 'react';
import { useApiQuery } from '../api/useApiQuery';
import { StatusPanel } from '../layout/StatusPanel';
import { formatMoney } from '../money/money';
import { formatDay } from '../months/month';
import { Dialog } from '../transactions/Dialog';
import { SignedAmount } from '../transactions/TransactionTable';
import { transactionsApi } from '../transactions/transactions-api';
import { recurringApi, type RecurringDraft, type RecurringRule } from './recurring-api';
import { ordinalDay, RecurringForm } from './RecurringForm';

type Editing = { mode: 'create' } | { mode: 'edit'; rule: RecurringRule } | null;

function monthlyNet(rules: RecurringRule[]): number {
  return rules
    .filter((rule) => rule.active)
    .reduce((sum, rule) => sum + (rule.type === 'income' ? rule.amountCents : -rule.amountCents), 0);
}

export function RecurringPage() {
  const categories = useApiQuery(() => transactionsApi.categories(), []);
  const rules = useApiQuery(() => recurringApi.list(), []);
  const [editing, setEditing] = useState<Editing>(null);

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      await action();
      rules.reload();
    } catch (cause) {
      window.alert(cause instanceof Error ? cause.message : 'Something went wrong');
    }
  };

  const save = async (draft: RecurringDraft) => {
    if (editing?.mode === 'edit') await recurringApi.update(editing.rule.id, draft);
    else await recurringApi.create(draft);
    setEditing(null);
    rules.reload();
  };

  const remove = (rule: RecurringRule) => {
    if (!window.confirm(`Delete "${rule.note || rule.category}"? Transactions already created are kept.`)) return;
    void runAction(() => recurringApi.remove(rule.id));
  };

  const net = monthlyNet(rules.value ?? []);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Recurring</h1>
          <p className="muted">
            {rules.value?.length
              ? `Fixed items net ${net >= 0 ? '+' : '−'}${formatMoney(Math.abs(net))} every month.`
              : 'Salary, rent, subscriptions — added automatically each month.'}
          </p>
        </div>
        <button className="button button--primary" type="button" disabled={!categories.value} onClick={() => setEditing({ mode: 'create' })}>
          + New rule
        </button>
      </header>

      <StatusPanel error={rules.error} loading={rules.loading && !rules.value} onRetry={rules.reload} />

      {rules.value && (
        <section className="panel panel--flush">
          {rules.value.length === 0 ? (
            <p className="empty-state">No recurring rules yet. Add your salary or rent to get started.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Rule</th>
                    <th scope="col">Schedule</th>
                    <th scope="col">Next</th>
                    <th scope="col" className="numeric">
                      Amount
                    </th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.value.map((rule) => (
                    <tr key={rule.id} className={rule.active ? undefined : 'is-paused'}>
                      <td>
                        <strong className="rule-name">{rule.note || rule.category}</strong>
                        <span className={`pill pill--${rule.type}`}>{rule.category}</span>
                      </td>
                      <td className="nowrap muted">Monthly on the {ordinalDay(rule.dayOfMonth)}</td>
                      <td className="nowrap">
                        {rule.nextOccurrence ? formatDay(rule.nextOccurrence) : <span className="status-chip status-chip--warning">❚❚ Paused</span>}
                      </td>
                      <td className="numeric">
                        <SignedAmount transaction={rule} />
                      </td>
                      <td className="row-actions">
                        <button className="button button--ghost button--small" type="button" onClick={() => runAction(() => recurringApi.update(rule.id, { active: !rule.active }))}>
                          {rule.active ? 'Pause' : 'Resume'}
                        </button>
                        <button className="button button--ghost button--small" type="button" onClick={() => setEditing({ mode: 'edit', rule })}>
                          Edit
                        </button>
                        <button className="button button--danger button--small" type="button" onClick={() => remove(rule)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <Dialog title={editing?.mode === 'edit' ? 'Edit recurring rule' : 'New recurring rule'} open={editing !== null} onClose={() => setEditing(null)}>
        {categories.value && (
          <RecurringForm
            categories={categories.value}
            initial={editing?.mode === 'edit' ? editing.rule : null}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Dialog>
    </>
  );
}
