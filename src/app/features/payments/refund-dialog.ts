import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import type { Payment, Refund } from '../../core/api/types';
import { centsToInput, parseToCents } from '../../core/format/money';
import { TPipe } from '../../core/i18n/t.pipe';
import { injectDialog } from '../../shared/dialog';
import { MoneyPipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { PaymentsApi } from './payments.api';

/** What can still be returned on a payment. Always in the payment's own currency. */
export function refundableCents(
  p: Pick<Payment, 'amountCents' | 'refundedCents' | 'status'>,
): number {
  if (p.status !== 'SUCCEEDED' && p.status !== 'PARTIALLY_REFUNDED') return 0;
  return Math.max(0, p.amountCents - (p.refundedCents ?? 0));
}

/** Parses the typed amount; `null` when it is not positive, malformed, or above what is refundable. */
export function parseRefundAmount(input: string, max: number): number | null {
  const cents = parseToCents(input);
  return cents !== null && cents >= 1 && cents <= max ? cents : null;
}

@Component({
  selector: 'app-refund-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TPipe,
    MoneyPipe,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmTextareaImports,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4" novalidate>
      <hlm-dialog-header>
        <h2 hlmDialogTitle>{{ 'payments.refund.title' | t }}</h2>
        <p hlmDialogDescription>
          {{ 'payments.refund.available' | t: { amount: '' }
          }}<strong>{{ max | money: payment.currency }}</strong> ·
          {{ 'payments.refund.capHint' | t }}
        </p>
      </hlm-dialog-header>
      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'payments.refund.amount' | t: { currency: payment.currency } }}</span>
        <input hlmInput inputmode="decimal" formControlName="amount" />
        @if (form.controls.amount.touched && amountCents() === null) {
          <span class="text-xs text-destructive">{{ 'payments.refund.invalidAmount' | t }}</span>
        }
      </label>
      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'payments.refund.reason' | t }}</span>
        <textarea hlmTextarea rows="2" formControlName="reason"></textarea>
        @if (form.controls.reason.touched && form.controls.reason.invalid) {
          <span class="text-xs text-destructive">{{ 'common.required' | t }}</span>
        }
      </label>
      <hlm-dialog-footer>
        <button hlmBtn type="button" variant="outline" (click)="dialog.close()">
          {{ 'common.cancel' | t }}
        </button>
        <button hlmBtn type="submit" [disabled]="busy()">
          {{ 'payments.refund.confirm' | t }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class RefundDialog {
  protected readonly dialog = injectDialog<{ payment: Payment }, Refund>();
  private readonly api = inject(PaymentsApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly idempotencyKey = crypto.randomUUID();
  protected readonly payment = this.dialog.context.payment;
  protected readonly max = refundableCents(this.payment);
  protected readonly busy = signal(false);
  protected readonly form = this.fb.group({
    amount: [centsToInput(this.max)],
    reason: ['', Validators.required],
  });

  protected amountCents() {
    return parseRefundAmount(this.form.controls.amount.value, this.max);
  }

  protected async submit() {
    this.form.markAllAsTouched();
    const amountCents = this.amountCents();
    if (amountCents === null || this.form.invalid) return;
    this.busy.set(true);
    try {
      const refund = await this.api.refund(
        this.payment.id,
        { amountCents, reason: this.form.controls.reason.value.trim() },
        this.idempotencyKey,
      );
      this.notify.success('payments.refund.done');
      this.dialog.close(refund);
    } catch (e) {
      // 403 means the amount is above the operator cap: the API message says so.
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
