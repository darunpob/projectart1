import { formatMoney } from '../money/money';
import { formatDay } from '../months/month';
import type { Transaction } from './transactions-api';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

export function SignedAmount({ transaction }: { transaction: Transaction }) {
  const sign = transaction.type === 'income' ? '+' : '−';
  return (
    <span className={`amount amount--${transaction.type}`}>
      {sign}
      {formatMoney(transaction.amountCents)}
    </span>
  );
}

export function TransactionTable({ transactions, onEdit, onDelete }: TransactionTableProps) {
  const hasActions = Boolean(onEdit || onDelete);
  if (transactions.length === 0) {
    return <p className="empty-state">No transactions match these filters yet.</p>;
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Category</th>
            <th scope="col">Note</th>
            <th scope="col" className="numeric">
              Amount
            </th>
            {hasActions && (
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td className="nowrap muted">{formatDay(transaction.occurredOn)}</td>
              <td>
                <span className={`pill pill--${transaction.type}`}>{transaction.category}</span>
              </td>
              <td className="truncate">{transaction.note || <span className="muted">—</span>}</td>
              <td className="numeric">
                <SignedAmount transaction={transaction} />
              </td>
              {hasActions && (
                <td className="row-actions">
                  {onEdit && (
                    <button className="button button--ghost button--small" type="button" onClick={() => onEdit(transaction)}>
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button className="button button--danger button--small" type="button" onClick={() => onDelete(transaction)}>
                      Delete
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
