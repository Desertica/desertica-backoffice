import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { TPipe } from '../core/i18n/t.pipe';
import type { MessageKey } from '../core/i18n/messages.es';

export type StatusKind = 'booking' | 'departure' | 'payment' | 'document' | 'waiver';

type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONES: Record<StatusKind, Record<string, Tone>> = {
  booking: {
    PENDING_PAYMENT: 'warning',
    CONFIRMED: 'success',
    COMPLETED: 'info',
    CANCELLED: 'neutral',
    NO_SHOW: 'danger',
  },
  departure: { OPEN: 'success', CLOSED: 'warning', CANCELLED: 'neutral', COMPLETED: 'info' },
  payment: {
    PENDING: 'warning',
    REQUIRES_ACTION: 'warning',
    SUCCEEDED: 'success',
    FAILED: 'danger',
    CANCELLED: 'neutral',
    PARTIALLY_REFUNDED: 'info',
    REFUNDED: 'neutral',
    DISPUTED: 'danger',
  },
  document: {
    PENDING: 'warning',
    ISSUED: 'success',
    ACCEPTED: 'success',
    REJECTED: 'danger',
    VOIDED: 'neutral',
    ERROR: 'danger',
  },
  waiver: { PENDING: 'warning', SIGNED: 'success' },
};

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  neutral: 'bg-muted text-muted-foreground',
};

/** Coloured status pill; the colour is never the only signal because the text always shows the status. */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmBadgeImports, TPipe],
  template: `<span hlmBadge variant="ghost" [class]="toneClass()">{{ label() | t }}</span>`,
})
export class StatusBadge {
  readonly kind = input.required<StatusKind>();
  readonly value = input.required<string>();

  protected readonly label = computed(() => `status.${this.kind()}.${this.value()}` as MessageKey);
  protected readonly toneClass = computed(
    () => TONE_CLASS[TONES[this.kind()][this.value()] ?? 'neutral'],
  );
}
