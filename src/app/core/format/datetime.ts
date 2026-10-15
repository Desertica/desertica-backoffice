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

/** Adds calendar days to a `YYYY-MM-DD` string (pure date arithmetic, no timezone involved). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function limaToday(now: Date = new Date()): string {
  return limaDay(now);
}

/** First day of the month containing `day`. */
export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Day of the week (0 = Sunday) of a `YYYY-MM-DD` date. */
export function weekdayOf(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

/** `HH:mm` (24 h) of an instant as seen in Lima; used to fill `<input type="time">`. */
export function limaTime24(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    ...base,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}
