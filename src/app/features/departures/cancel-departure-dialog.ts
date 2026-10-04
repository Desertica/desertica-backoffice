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
import { TourCatalog } from '../../core/api/tour-catalog';
import type { Departure } from '../../core/api/types';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe } from '../../shared/format.pipes';
import { injectDialog } from '../../shared/dialog';
import { Notify } from '../../shared/notify';
import { DeparturesApi } from './departures.api';

type Resolution = 'REFUND' | 'RESCHEDULE' | 'CLIENT_CHOICE';

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
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly catalog = inject(TourCatalog);

  protected readonly departure = this.dialog.context.departure;
  protected readonly resolutions: readonly Resolution[] = ['REFUND', 'RESCHEDULE', 'CLIENT_CHOICE'];
  protected readonly busy = signal(false);

  protected readonly form = this.fb.group({
    reason: ['', Validators.required],
    resolution: ['REFUND' as Resolution],
    targetDepartureId: [''],
  });
  protected readonly resolution = signal<Resolution>('REFUND');

  protected readonly candidates = resource({
    params: () => (this.resolution() === 'RESCHEDULE' ? this.departure.tourRefId : undefined),
    loader: ({ params }) =>
      this.api.listAll({ tourRefId: params, status: 'OPEN', from: new Date().toISOString() }),
  });
  protected readonly targets = computed(() =>
    (this.candidates.value() ?? []).filter((t) => canAbsorb(t, this.departure)),
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
