import { Pipe, type PipeTransform, inject } from '@angular/core';
import { I18n } from './i18n.service';
import type { MessageKey } from './messages.es';

/** `{{ 'nav.bookings' | t }}`. Impure on purpose: it re-reads the language signal on each change detection. */
@Pipe({ name: 't', pure: false })
export class TPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(key: MessageKey, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}

export type EnumPrefix =
  | 'status.booking'
  | 'status.departure'
  | 'status.payment'
  | 'status.document'
  | 'status.waiver'
  | 'enum.paymentKind'
  | 'enum.paymentMethod'
  | 'enum.source'
  | 'enum.format'
  | 'enum.idDocType'
  | 'enum.docType'
  | 'weekday'
  | 'departures.cancel.resolution';

/** `{{ d.format | enumLabel: 'enum.format' }}`: translates an API enum value; unknown values show as-is. */
@Pipe({ name: 'enumLabel', pure: false })
export class EnumLabelPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(value: string | number | null | undefined, prefix: EnumPrefix): string {
    if (value == null) return '—';
    const key = `${prefix}.${value}`;
    return this.i18n.has(key) ? this.i18n.t(key as MessageKey) : String(value);
  }
}
