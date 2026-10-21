import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

const longLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortLabel = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const dayLabel = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const monthToDate = (month: string) => new Date(`${month}-01T00:00:00Z`);

export const currentMonth = (now: Date = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export const todayIso = (now: Date = new Date()): string =>
  `${currentMonth(now)}-${String(now.getDate()).padStart(2, '0')}`;

export function shiftMonth(month: string, offset: number): string {
  const date = monthToDate(month);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export const formatMonthLong = (month: string): string => longLabel.format(monthToDate(month));
export const formatMonthShort = (month: string): string => shortLabel.format(monthToDate(month));
export const formatDay = (isoDate: string): string => dayLabel.format(new Date(`${isoDate}T00:00:00Z`));

export function useMonthParam(): [string, (month: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('month') ?? '';
  const month = MONTH_PATTERN.test(requested) ? requested : currentMonth();

  const setMonth = useCallback(
    (next: string) =>
      setSearchParams((params) => {
        params.set('month', next);
        return params;
      }),
    [setSearchParams],
  );
  return [month, setMonth];
}
