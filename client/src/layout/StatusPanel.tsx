interface StatusPanelProps {
  error: Error | null;
  loading: boolean;
  onRetry: () => void;
}

export function StatusPanel({ error, loading, onRetry }: StatusPanelProps) {
  if (error) {
    return (
      <div className="panel status-panel" role="alert">
        <p>Couldn’t load this view: {error.message}</p>
        <button className="button button--ghost button--small" type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="panel status-panel" aria-busy="true">
        <span className="spinner" aria-hidden="true" /> Loading…
      </div>
    );
  }
  return null;
}
