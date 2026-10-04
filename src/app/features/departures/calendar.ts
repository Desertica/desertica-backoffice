import { addDays, startOfMonth, weekdayOf } from '../../core/format/datetime';

/** `YYYY-MM` of a day. */
export const monthOf = (day: string) => day.slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Last calendar day of a `YYYY-MM` month. */
export function endOfMonth(month: string): string {
  return addDays(`${shiftMonth(month, 1)}-01`, -1);
}

export interface CalendarCell {
  day: string;
  inMonth: boolean;
}

/** Weeks (Monday first) covering a month, padded with neighbouring days. */
export function monthGrid(month: string): CalendarCell[][] {
  const first = `${month}-01`;
  const lead = (weekdayOf(first) + 6) % 7; // Monday = 0
  const last = endOfMonth(month);
  const total = Math.ceil((lead + Number(last.slice(8))) / 7) * 7;
  const start = addDays(startOfMonth(first), -lead);
  const cells: CalendarCell[] = Array.from({ length: total }, (_, i) => {
    const day = addDays(start, i);
    return { day, inMonth: monthOf(day) === month };
  });
  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
