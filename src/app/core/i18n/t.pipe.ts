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
