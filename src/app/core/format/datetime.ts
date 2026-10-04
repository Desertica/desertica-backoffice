/** The API sends UTC; staff always read Lima time. */
export const BUSINESS_TZ = 'America/Lima';

const base = { timeZone: BUSINESS_TZ } as const;

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { ...base, dateStyle: 'medium' }).format(new Date(iso));
}

export function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { ...base, timeStyle: 'short' }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    ...base,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

/** `YYYY-MM-DD` of an instant, as seen in Lima. */
export function limaDay(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-CA', {
    ...base,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Lima has no DST (UTC-5 all year), so a Lima wall-clock time maps to UTC by adding 5 hours. */
export function limaToUtcIso(day: string, time = '00:00'): string {
  return new Date(`${day}T${time}:00-05:00`).toISOString();
}
