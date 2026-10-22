import { buildCreateDeparture } from './departure-form';

const base = {
  tourRefId: 't1',
  date: '2026-10-10',
  time: '08:30',
  capacity: 12,
  format: 'SHARED' as const,
  language: ' ',
  meetingPoint: '',
  guideName: ' Ana ',
  vehicleNote: '',
  notes: '',
  cutoffMinutes: null,
  repeat: false,
  until: '',
  weekdays: [],
};

describe('buildCreateDeparture', () => {
  it('converts the Lima wall-clock time to UTC and drops empty optional fields', () => {
    const body = buildCreateDeparture(base);
    expect(body.startsAt).toBe('2026-10-10T13:30:00.000Z');
    expect(body.language).toBe('es');
    expect(body.guideName).toBe('Ana');
    expect(body).not.toHaveProperty('meetingPoint');
    expect(body).not.toHaveProperty('repeat');
  });

  it('adds the series only when repeating', () => {
    const body = buildCreateDeparture({
      ...base,
      repeat: true,
      until: '2026-11-01',
      weekdays: [6, 1, 0],
    });
    expect(body.repeat).toEqual({ until: '2026-11-01', weekdays: [0, 1, 6] });
  });
});
