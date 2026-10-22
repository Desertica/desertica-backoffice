import { UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { ApiError } from '../../core/api/api-error';
import type { Departure, UpdateDeparture } from '../../core/api/types';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { limaDay, limaTime24, limaToUtcIso } from '../../core/format/datetime';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { downloadCsv, toCsv } from '../../shared/csv';
import { useDialogs } from '../../shared/dialog';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { TruncatedNotice } from '../../shared/truncated-notice';
import { StatusBadge } from '../../shared/status-badge';
import { BookingsApi } from '../bookings/bookings.api';
import { CancelDepartureDialog } from './cancel-departure-dialog';
import { DeparturesApi } from './departures.api';

/** Only the fields that changed, so a PATCH never rewrites what the staff did not touch. */
export function diffUpdate(
  original: Departure,
  v: {
    date: string;
    time: string;
    capacity: number;
    meetingPoint: string;
    guideName: string;
    vehicleNote: string;
    notes: string;
    cutoffMinutes: number | null;
  },
): UpdateDeparture {
  const out: UpdateDeparture = {};
  const startsAt = limaToUtcIso(v.date, v.time);
  if (new Date(startsAt).getTime() !== new Date(original.startsAt).getTime())
    out.startsAt = startsAt;
  if (v.capacity !== original.capacity) out.capacity = v.capacity;
  if (v.meetingPoint !== (original.meetingPoint ?? '')) out.meetingPoint = v.meetingPoint;
  if (v.guideName !== (original.guideName ?? '')) out.guideName = v.guideName;
  if (v.vehicleNote !== (original.vehicleNote ?? '')) out.vehicleNote = v.vehicleNote;
  if (v.notes !== (original.notes ?? '')) out.notes = v.notes;
  if (v.cutoffMinutes != null && v.cutoffMinutes !== original.cutoffMinutes)
    out.cutoffMinutes = v.cutoffMinutes;
  return out;
}

@Component({
  selector: 'app-departure-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    UpperCasePipe,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    MoneyPipe,
    StatusBadge,
    TruncatedNotice,
    HasPermissionDirective,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSkeletonImports,
    HlmTableImports,
    HlmTextareaImports,
  ],
  templateUrl: './departure-detail.html',
})
export class DepartureDetail {
  /** Bound from the route (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  private readonly api = inject(DeparturesApi);
  private readonly bookingsApi = inject(BookingsApi);
  private readonly notify = inject(Notify);
  private readonly dialogs = useDialogs();
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly tab = signal<'bookings' | 'manifest'>('bookings');
  protected readonly saving = signal(false);
  protected readonly editing = signal(false);

  protected readonly departure = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.get(params),
  });
  protected readonly bookings = resource({
    params: () => this.id(),
    loader: async ({ params }) => {
      const page = await this.bookingsApi.list({ departureId: params, pageSize: 100 });
      return { items: page.data, truncated: page.meta.total > page.data.length };
    },
  });
  protected readonly manifest = resource({
    params: () => (this.tab() === 'manifest' ? this.id() : undefined),
    loader: ({ params }) => this.api.manifest(params),
  });

  protected readonly notFound = computed(
    () =>
      this.departure.error() instanceof ApiError &&
      (this.departure.error() as ApiError).statusCode === 404,
  );
  protected readonly editable = computed(() =>
    ['OPEN', 'CLOSED'].includes(this.departure.value()?.status ?? ''),
  );
  protected readonly title = computed(() => {
    const d = this.departure.value();
    return d?.tourTitle ?? '';
  });

  protected readonly form = this.fb.group({
    date: ['', Validators.required],
    time: ['', Validators.required],
    capacity: [1, [Validators.required, Validators.min(1)]],
    meetingPoint: [''],
    guideName: [''],
    vehicleNote: [''],
    notes: [''],
    cutoffMinutes: [null as number | null, Validators.min(0)],
  });

  constructor() {
    effect(() => {
      const d = this.departure.value();
      if (!d) return;
      this.form.reset({
        date: limaDay(d.startsAt),
        time: limaTime24(d.startsAt),
        capacity: d.capacity,
        meetingPoint: d.meetingPoint ?? '',
        guideName: d.guideName ?? '',
        vehicleNote: d.vehicleNote ?? '',
        notes: d.notes ?? '',
        cutoffMinutes: d.cutoffMinutes ?? null,
      });
    });
  }

  protected async save() {
    const d = this.departure.value();
    if (!d || this.form.invalid) return;
    const patch = diffUpdate(d, this.form.getRawValue());
    if (Object.keys(patch).length === 0) {
      this.editing.set(false);
      return;
    }
    await this.run(() => this.api.update(d.id, patch), 'common.saved');
    this.editing.set(false);
  }

  protected async toggleSales() {
    const d = this.departure.value();
    if (!d) return;
    const next = d.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    await this.run(
      () => this.api.update(d.id, { status: next }),
      next === 'CLOSED' ? 'departures.detail.closed' : 'departures.detail.reopened',
    );
  }

  protected async cancelDeparture() {
    const d = this.departure.value();
    if (!d) return;
    const result = await this.dialogs.open<{ affectedBookings: number }, { departure: Departure }>(
      CancelDepartureDialog,
      { departure: d },
    );
    if (result) {
      this.departure.reload();
      this.bookings.reload();
    }
  }

  protected exportCsv() {
    const m = this.manifest.value();
    if (!m) return;
    const header = [
      'Passenger',
      'Booking',
      'ID',
      'Phone',
      'Emergency',
      'Emergency phone',
      'Medical',
      'Waiver',
      'Balance due',
      'Currency',
    ];
    const rows = m.passengers.map((p) => [
      p.name,
      p.bookingReference,
      [p.idDocType, p.idDocNumber].filter(Boolean).join(' '),
      p.phone,
      p.emergencyContactName,
      p.emergencyContactPhone,
      p.medicalNotes,
      p.waiverStatus,
      p.balanceDueCents != null ? p.balanceDueCents / 100 : '',
      p.currency,
    ]);
    downloadCsv(`manifest-${limaDay(m.departure.startsAt)}.csv`, toCsv([header, ...rows]));
  }

  protected print() {
    window.print();
  }

  private async run(action: () => Promise<unknown>, success: Parameters<Notify['success']>[0]) {
    this.saving.set(true);
    try {
      await action();
      this.notify.success(success);
      this.departure.reload();
    } catch (e) {
      // 409 on capacity: the API message names the sold seats; fall back to a translated hint.
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }
}
