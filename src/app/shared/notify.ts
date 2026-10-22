import { Injectable, inject } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';
import { ApiError } from '../core/api/api-error';
import { I18n } from '../core/i18n/i18n.service';
import type { MessageKey } from '../core/i18n/messages.es';

@Injectable({ providedIn: 'root' })
export class Notify {
  private readonly i18n = inject(I18n);

  success(key: MessageKey, params?: Record<string, string | number>) {
    toast.success(this.i18n.t(key, params));
  }

  info(key: MessageKey) {
    toast.info(this.i18n.t(key));
  }

  /** Shows the API's own message when there is one (it is already user-facing), else a generic text. */
  error(e: unknown) {
    toast.error(errorMessage(e, this.i18n));
  }
}

export function errorMessage(e: unknown, i18n: I18n): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof TypeError) return i18n.t('common.error.network');
  return i18n.t('common.error.generic');
}
