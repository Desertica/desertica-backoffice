import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import type { BookingSummary, Currency, Departure } from '../../core/api/types';
import { sumByCurrency } from '../../core/format/money';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { injectDialog } from '../../shared/dialog';
import { Notify } from '../../shared/notify';
import { TruncatedNotice } from '../../shared/truncated-notice';
import { BookingsApi } from '../bookings/bookings.api';
import { DeparturesApi, upcomingRange } from './departures.api';

type Resolution = 'REFUND' | 'RESCHEDULE' | 'CLIENT_CHOICE';

/** What a REFUND cancellation will touch: live bookings and, per currency, what they have paid. */
export function refundSummary(
  rows: readonly Pick<BookingSummary, 'status' | 'currency' | 'paidCents'>[],
) {
  const live = rows.filter((b) => b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED');
  const totals = sumByCurrency(
    live.map((b) => ({ amountCents: b.paidCents, currency: b.currency as Currency })),
  );
  return { count: live.length, totals: Object.entries(totals) as [Currency, number][] };
}

/** Seats a target departure must have free to absorb the cancelled one. */
export function canAbsorb(target: Departure, source: Departure): boolean {
  return (
    target.id !== source.id &&
    target.status === 'OPEN' &&
    target.capacity - target.seatsSold - (target.seatsHeld ?? 0) >= source.seatsSold
  );
}

@Component({
  selector: 'app-cancel-departure-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    MoneyPipe,
    TruncatedNotice,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmTextareaImports,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4" novalidate>
      <hlm-dialog-header>
        <h2 hlmDialogTitle>{{ 'departures.cancel.title' | t }}</h2>
        <p hlmDialogDescription>{{ 'departures.cancel.warning' | t }}</p>
      </hlm-dialog-header>

      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'departures.cancel.reason' | t }}</span>
        <textarea hlmTextarea rows="2" formControlName="reason"></textarea>
        @if (form.controls.reason.touched && form.controls.reason.invalid) {
          <span class="text-xs text-destructive">{{ 'common.required' | t }}</span>
        }
      </label>

      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'departures.cancel.resolution' | t }}</span>
        <select hlmInput formControlName="resolution">
          @for (r of resolutions; track r) {
            <option [value]="r">{{ r | enumLabel: 'departures.cancel.resolution' }}</option>
          }
        </select>
      </label>

      @if (resolution() === 'REFUND' && refunds.value(); as r) {
        <div class="rounded-lg border border-destructive/40 p-3 text-sm" role="status">
          {{ 'departures.cancel.refundCount' | t: { count: r.summary.count } }}
          @for (t of r.summary.totals; track t[0]) {
            <strong class="ml-1">{{ t[1] | money: t[0] }}</strong>
          }
          <app-truncated-notice [show]="r.truncated" />
        </div>
      }

      @if (resolution() === 'RESCHEDULE') {
        @if (targets().length === 0 && !candidates.isLoading()) {
          <p class="text-sm text-destructive">{{ 'departures.cancel.noTargets' | t }}</p>
        } @else {
          <label class="grid gap-1.5">
            <span hlmLabel>{{ 'departures.cancel.target' | t }}</span>
            <select hlmInput formControlName="targetDepartureId">
              <option value="">{{ 'departures.cancel.targetPlaceholder' | t }}</option>
              @for (t of targets(); track t.id) {
                <option [value]="t.id">
                  {{ t.startsAt | limaDateTime }} · {{ t.capacity - t.seatsSold }}
                </option>
              }
            </select>
          </label>
          <app-truncated-notice [show]="candidates.value()?.truncated" />
        }
      }

      <hlm-dialog-footer>
        <button hlmBtn type="button" variant="outline" (click)="dialog.close()">
          {{ 'common.cancel' | t }}
        </button>
        <button hlmBtn type="submit" variant="destructive" [disabled]="busy()">
          {{ 'departures.cancel.confirm' | t }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class CancelDepartureDialog {
  protected readonly dialog = injectDialog<
    { departure: Departure },
    { affectedBookings: number }
  >();
  private readonly api = inject(DeparturesApi);
  private readonly bookingsApi = inject(BookingsApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly departure = this.dialog.context.departure;
  protected readonly resolutions: readonly Resolution[] = ['REFUND', 'RESCHEDULE', 'CLIENT_CHOICE'];
  protected readonly busy = signal(false);

  protected readonly form = this.fb.group({
    reason: ['', Validators.required],
    resolution: ['REFUND' as Resolution],
    targetDepartureId: [''],
  });
  protected readonly resolution = signal<Resolution>('REFUND');

  protected readonly refunds = resource({
    params: () => (this.resolution() === 'REFUND' ? this.departure.id : undefined),
    loader: async ({ params }) => {
      const page = await this.bookingsApi.list({ departureId: params, pageSize: 100 });
      return { summary: refundSummary(page.data), truncated: page.meta.total > page.data.length };
    },
  });

  protected readonly candidates = resource({
    params: () => (this.resolution() === 'RESCHEDULE' ? this.departure.tourRefId : undefined),
    loader: ({ params }) =>
      this.api.listAll({ tourRefId: params, status: 'OPEN', ...upcomingRange() }),
  });
  protected readonly targets = computed(() =>
    (this.candidates.value()?.items ?? []).filter((t) => canAbsorb(t, this.departure)),
  );

  constructor() {
    this.form.controls.resolution.valueChanges.subscribe((r) => this.resolution.set(r));
  }

  protected async submit() {
    const v = this.form.getRawValue();
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    if (v.resolution === 'RESCHEDULE' && !v.targetDepartureId) return;
    this.busy.set(true);
    try {
      const res = await this.api.cancel(this.departure.id, {
        reason: v.reason.trim(),
        resolution: v.resolution,
        ...(v.resolution === 'RESCHEDULE' ? { targetDepartureId: v.targetDepartureId } : {}),
      });
      this.notify.success('departures.cancel.done', { count: res.affectedBookings });
      this.dialog.close(res);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}
