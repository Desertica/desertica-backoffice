import { Pipe, type PipeTransform, inject } from '@angular/core';
import type { Currency } from '../core/api/types';
import { formatDate, formatDateTime, formatTime } from '../core/format/datetime';
import { formatMoney } from '../core/format/money';
import { I18n } from '../core/i18n/i18n.service';

// Impure on purpose: they read the language signal, so labels refresh when the language changes.

/** `{{ b.totalCents | money: b.currency }}`: amount in cents, in the booking's own currency. */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(cents: number | null | undefined, currency: Currency): string {
    return cents == null ? '—' : formatMoney(cents, currency, this.i18n.locale);
  }
}

/** UTC instants from the API, shown in America/Lima. */
@Pipe({ name: 'limaDateTime', pure: false })
export class LimaDateTimePipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(
    iso: string | null | undefined,
    part: 'datetime' | 'date' | 'time' = 'datetime',
  ): string {
    if (!iso) return '—';
    const fn = part === 'date' ? formatDate : part === 'time' ? formatTime : formatDateTime;
    return fn(iso, this.i18n.locale);
  }
}
