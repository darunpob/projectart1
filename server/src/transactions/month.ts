export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export interface DateRange {
  from: string;
  to: string;
}

export function monthRange(month: string): DateRange {
  return { from: `${month}-01`, to: `${month}-31` };
}

export function shiftMonth(month: string, offset: number): string {
  const [year, monthIndex] = month.split('-').map(Number) as [number, number];
  const shifted = new Date(Date.UTC(year, monthIndex - 1 + offset, 1));
  return shifted.toISOString().slice(0, 7);
}

export function currentMonth(now: Date = new Date()): string {
  return now.toISOString().slice(0, 7);
}
