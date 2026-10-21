import { daysInMonth, shiftMonth } from '../transactions/month.js';

export const MAX_CATCH_UP_MONTHS = 24;

export interface Schedule {
  dayOfMonth: number;
  startMonth: string;
  lastGeneratedMonth: string | null;
}

export function occurrenceDate(month: string, dayOfMonth: number): string {
  const day = Math.min(dayOfMonth, daysInMonth(month));
  return `${month}-${String(day).padStart(2, '0')}`;
}

function firstPendingMonth(schedule: Schedule): string {
  if (!schedule.lastGeneratedMonth) return schedule.startMonth;
  const afterLast = shiftMonth(schedule.lastGeneratedMonth, 1);
  return afterLast > schedule.startMonth ? afterLast : schedule.startMonth;
}

export function dueOccurrences(schedule: Schedule, today: string): string[] {
  const dates: string[] = [];
  let month = firstPendingMonth(schedule);
  for (let step = 0; step < MAX_CATCH_UP_MONTHS; step += 1) {
    const date = occurrenceDate(month, schedule.dayOfMonth);
    if (date > today) break;
    dates.push(date);
    month = shiftMonth(month, 1);
  }
  return dates;
}

export function latestElapsedMonth(dayOfMonth: number, today: string): string {
  const thisMonth = today.slice(0, 7);
  return occurrenceDate(thisMonth, dayOfMonth) <= today ? thisMonth : shiftMonth(thisMonth, -1);
}

export function nextOccurrence(schedule: Schedule, today: string): string {
  let month = firstPendingMonth(schedule);
  let date = occurrenceDate(month, schedule.dayOfMonth);
  while (date <= today) {
    month = shiftMonth(month, 1);
    date = occurrenceDate(month, schedule.dayOfMonth);
  }
  return date;
}
