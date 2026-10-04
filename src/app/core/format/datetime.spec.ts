import { formatDateTime, limaDay, limaToUtcIso } from './datetime';

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
