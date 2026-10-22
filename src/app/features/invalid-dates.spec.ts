import { toBookingQuery } from './bookings/bookings-page';
import { initialDate } from './departures/departure-form';
import { toDocumentQuery } from './documents/documents-page';
import { toPaymentQuery } from './payments/payments-page';

describe('invalid dates in the URL', () => {
  const bad = { from: '2026-02-30', to: 'garbage' };

  it('are ignored by every list query instead of throwing', () => {
    for (const q of [toBookingQuery(bad), toPaymentQuery(bad), toDocumentQuery(bad)]) {
      expect(q.from).toBeUndefined();
      expect(q.to).toBeUndefined();
    }
  });

  it('keep valid days working', () => {
    expect(toPaymentQuery({ from: '2026-03-09' }).from).toBe('2026-03-09T05:00:00.000Z');
  });

  it('fall back to today on the departure form', () => {
    expect(initialDate('2026-03-09')).toBe('2026-03-09');
    expect(initialDate('2026-99-99')).not.toBe('2026-99-99');
    expect(initialDate(null)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
