import { useRef, useState, type ChangeEvent } from 'react';
import { ApiError } from '../api/http';
import { transactionsApi, type TransactionFilters } from './transactions-api';

interface CsvActionsProps {
  filters: TransactionFilters;
  onImported: () => void;
}

type Notice = { tone: 'success' | 'error'; message: string; details: string[] };

const MAX_LISTED_ISSUES = 5;

function describeImportFailure(cause: unknown): Notice {
  if (!(cause instanceof ApiError)) {
    return { tone: 'error', message: 'Import failed. Check your connection and try again.', details: [] };
  }
  const details = cause.issues.slice(0, MAX_LISTED_ISSUES).map((issue) => `${issue.path}: ${issue.message}`);
  if (cause.issues.length > MAX_LISTED_ISSUES) details.push(`…and ${cause.issues.length - MAX_LISTED_ISSUES} more`);
  return { tone: 'error', message: cause.message, details };
}

export function CsvActions({ filters, onImported }: CsvActionsProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const runExport = async () => {
    setBusy(true);
    try {
      await transactionsApi.exportCsv(filters);
    } catch (cause) {
      setNotice({ tone: 'error', message: cause instanceof Error ? cause.message : 'Export failed', details: [] });
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const imported = await transactionsApi.importCsv(await file.text());
      setNotice({ tone: 'success', message: `Imported ${imported} transaction${imported === 1 ? '' : 's'} from ${file.name}.`, details: [] });
      onImported();
    } catch (cause) {
      setNotice(describeImportFailure(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="csv-actions">
        <button className="button button--ghost" type="button" disabled={busy} onClick={runExport}>
          Export CSV
        </button>
        <button className="button button--ghost" type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
          Import CSV
        </button>
        <input ref={fileInput} type="file" accept=".csv,text/csv" hidden onChange={runImport} aria-label="CSV file to import" />
      </div>
      {notice && (
        <div className={`notice notice--${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          <div>
            <p>{notice.message}</p>
            {notice.details.length > 0 && (
              <ul>
                {notice.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
          <button className="icon-button" type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
