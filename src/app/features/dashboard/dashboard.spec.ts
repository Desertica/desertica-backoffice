import { occupancyPercent, rangeFor } from './dashboard';

describe('dashboard helpers', () => {
  it('computes inclusive Lima ranges from presets', () => {
    expect(rangeFor('today', '2026-10-04')).toEqual({ from: '2026-10-04', to: '2026-10-04' });
    expect(rangeFor('7d', '2026-10-04')).toEqual({ from: '2026-09-28', to: '2026-10-04' });
    expect(rangeFor('30d', '2026-10-04')).toEqual({ from: '2026-09-05', to: '2026-10-04' });
    expect(rangeFor('month', '2026-10-04')).toEqual({ from: '2026-10-01', to: '2026-10-04' });
  });

  it('rounds occupancy and survives zero capacity', () => {
    expect(occupancyPercent(7, 9)).toBe(78);
    expect(occupancyPercent(0, 0)).toBe(0);
    expect(occupancyPercent(undefined, undefined)).toBe(0);
  });
});
