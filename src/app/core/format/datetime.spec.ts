import {
  addDays,
  isDay,
  formatDateTime,
  limaDay,
  limaToUtcIso,
  limaToday,
  startOfMonth,
  weekdayOf,
} from './datetime';

describe('datetime (America/Lima)', () => {
  it('shows UTC instants in Lima time', () => {
    // 2026-03-10T03:30Z is 22:30 on the 9th in Lima (UTC-5).
    expect(limaDay('2026-03-10T03:30:00Z')).toBe('2026-03-09');
    expect(formatDateTime('2026-03-10T03:30:00Z', 'en-US')).toContain('10:30');
  });

  it('converts a Lima wall-clock time to UTC', () => {
    expect(limaToUtcIso('2026-03-09', '22:30')).toBe('2026-03-10T03:30:00.000Z');
  });
});

describe('date arithmetic', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-02-27', 3)).toBe('2026-03-02');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('finds the month start and weekday', () => {
    expect(startOfMonth('2026-10-15')).toBe('2026-10-01');
    expect(weekdayOf('2026-10-04')).toBe(0); // Sunday
  });

  it('uses the Lima day, not the UTC day', () => {
    expect(limaToday(new Date('2026-03-10T03:30:00Z'))).toBe('2026-03-09');
  });
});

describe('day validation', () => {
  it('accepts only real YYYY-MM-DD days', () => {
    expect(isDay('2026-02-28')).toBe(true);
    for (const bad of ['', 'abc', '2026-2-3', '2026-02-30', '2026-13-01', '2026-01-01T00:00'])
      expect(isDay(bad)).toBe(false);
  });

  it('refuses to convert invalid days instead of throwing a RangeError later', () => {
    expect(() => limaToUtcIso('2026-02-30')).toThrow('Invalid day');
    expect(() => addDays('nope', 1)).toThrow('Invalid day');
  });
});
