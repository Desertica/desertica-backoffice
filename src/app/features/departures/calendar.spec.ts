import { endOfMonth, monthGrid, shiftMonth } from './calendar';

describe('calendar', () => {
  it('shifts months across years', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
  });

  it('finds the last day of a month, leap years included', () => {
    expect(endOfMonth('2028-02')).toBe('2028-02-29');
    expect(endOfMonth('2026-10')).toBe('2026-10-31');
  });

  it('builds Monday-first weeks padded with neighbouring days', () => {
    const weeks = monthGrid('2026-10'); // 1 Oct 2026 is a Thursday
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0].day).toBe('2026-09-28');
    expect(weeks[0][3]).toEqual({ day: '2026-10-01', inMonth: true });
    expect(weeks.at(-1)!.at(-1)!.day).toBe('2026-11-01');
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(31);
  });
});
