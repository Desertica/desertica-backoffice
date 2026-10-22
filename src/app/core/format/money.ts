export type Currency = 'USD' | 'PEN';

/**
 * Formats an amount in minor units (`*Cents`) with the booking's own currency.
 * Amounts include IGV already; never pass a sum across different currencies.
 */
export function formatMoney(cents: number, currency: Currency, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

/** Totals grouped by currency, because USD and PEN are never added together. */
export function sumByCurrency(
  items: readonly { amountCents: number; currency: Currency }[],
): Partial<Record<Currency, number>> {
  const totals: Partial<Record<Currency, number>> = {};
  for (const { amountCents, currency } of items) {
    totals[currency] = (totals[currency] ?? 0) + amountCents;
  }
  return totals;
}

/** Parses user-typed major units ("12.50") into cents without floating point drift. */
export function parseToCents(input: string): number | null {
  const m = /^\s*(\d+)(?:[.,](\d{1,2}))?\s*$/.exec(input);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0') || 0);
}

/** Cents to the plain decimal string used in `<input>` fields ("1250" -> "12.50"). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}
