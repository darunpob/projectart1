import { currentMonth, formatMonthLong, shiftMonth } from '../months/month';

interface MonthSwitcherProps {
  month: string;
  onChange: (month: string) => void;
}

export function MonthSwitcher({ month, onChange }: MonthSwitcherProps) {
  const isCurrent = month >= currentMonth();
  return (
    <div className="month-switcher" role="group" aria-label="Select month">
      <button className="icon-button" type="button" aria-label="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>
        ‹
      </button>
      <span className="month-switcher__label" aria-live="polite">
        {formatMonthLong(month)}
      </span>
      <button
        className="icon-button"
        type="button"
        aria-label="Next month"
        disabled={isCurrent}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        ›
      </button>
    </div>
  );
}
