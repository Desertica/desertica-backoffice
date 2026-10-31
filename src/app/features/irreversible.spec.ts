import { matchesConfirmation } from '../shared/typed-confirm-dialog';
import { seriesPrefixError } from './admin/company-page';
import { refundSummary } from './departures/cancel-departure-dialog';

describe('irreversible actions', () => {
  it('unlocks the typed confirmation only on the RUC or PRODUCCION', () => {
    const accepted = ['20123456789', 'PRODUCCION'];
    expect(matchesConfirmation(' produccion ', accepted)).toBe(true);
    expect(matchesConfirmation('20123456789', accepted)).toBe(true);
    expect(matchesConfirmation('', accepted)).toBe(false);
    expect(matchesConfirmation('si', accepted)).toBe(false);
  });

  it('checks the series prefix against the document type, ignoring case', () => {
    expect(seriesPrefixError('BOLETA', 'b001')).toBe(false);
    expect(seriesPrefixError('BOLETA', 'F001')).toBe(true);
    expect(seriesPrefixError('FACTURA', 'F001')).toBe(false);
    expect(seriesPrefixError('FACTURA', 'B001')).toBe(true);
    expect(seriesPrefixError('NOTA_CREDITO', 'FC01')).toBe(false);
    expect(seriesPrefixError('NOTA_CREDITO', 'X001')).toBe(true);
    expect(seriesPrefixError('BOLETA', 'B01')).toBe(true);
  });

  it('summarizes a refund cancellation per currency over live bookings only', () => {
    const rows = [
      { status: 'CONFIRMED', currency: 'USD', paidCents: 1000 },
      { status: 'PENDING_PAYMENT', currency: 'USD', paidCents: 0 },
      { status: 'CONFIRMED', currency: 'PEN', paidCents: 500 },
      { status: 'CANCELLED', currency: 'USD', paidCents: 9999 },
    ] as const;
    const s = refundSummary([...rows]);
    expect(s.count).toBe(3);
    expect(Object.fromEntries(s.totals)).toEqual({ USD: 1000, PEN: 500 });
  });
});
