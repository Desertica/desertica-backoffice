import { formatMoney, parseToCents, sumByCurrency } from './money';

describe('money', () => {
  it('formats cents with the booking currency', () => {
    expect(formatMoney(12550, 'USD', 'en-US')).toBe('$125.50');
    expect(formatMoney(12550, 'PEN', 'es-PE')).toMatch(/S\/\s?125\.50/);
  });

  it('never merges currencies', () => {
    const totals = sumByCurrency([
      { amountCents: 100, currency: 'USD' },
      { amountCents: 250, currency: 'PEN' },
      { amountCents: 50, currency: 'USD' },
    ]);
    expect(totals).toEqual({ USD: 150, PEN: 250 });
  });

  it('parses typed amounts without float drift', () => {
    expect(parseToCents('12.5')).toBe(1250);
    expect(parseToCents('0,07')).toBe(7);
    expect(parseToCents('19.99')).toBe(1999);
    expect(parseToCents('abc')).toBeNull();
    expect(parseToCents('1.234')).toBeNull();
  });
});
