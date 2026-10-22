import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { startWith } from 'rxjs';
import { TourCatalog } from '../../core/api/tour-catalog';
import type { CreateDeparture, TourFormat } from '../../core/api/types';
import { isDay, limaToUtcIso, limaToday } from '../../core/format/datetime';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { Notify } from '../../shared/notify';
import { DeparturesApi } from './departures.api';

/** The `date` from the URL when it is a real day, otherwise today. */
export const initialDate = (param: string | null) => (param && isDay(param) ? param : limaToday());

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const;

/** Builds the API body from the form. Date and time are Lima wall-clock; the API wants UTC. */
export function buildCreateDeparture(v: {
  tourRefId: string;
  date: string;
  time: string;
  capacity: number;
  format: TourFormat;
  language: string;
  meetingPoint: string;
  guideName: string;
  vehicleNote: string;
  notes: string;
  cutoffMinutes: number | null;
  repeat: boolean;
  until: string;
  weekdays: number[];
}): CreateDeparture {
  const body: CreateDeparture = {
    tourRefId: v.tourRefId,
    startsAt: limaToUtcIso(v.date, v.time),
    capacity: v.capacity,
    format: v.format,
    language: v.language.trim() || 'es',
  };
  if (v.meetingPoint.trim()) body.meetingPoint = v.meetingPoint.trim();
  if (v.guideName.trim()) body.guideName = v.guideName.trim();
  if (v.vehicleNote.trim()) body.vehicleNote = v.vehicleNote.trim();
  if (v.notes.trim()) body.notes = v.notes.trim();
  if (v.cutoffMinutes != null) body.cutoffMinutes = v.cutoffMinutes;
  if (v.repeat) body.repeat = { until: v.until, weekdays: [...v.weekdays].sort() };
  return body;
}

@Component({
  selector: 'app-departure-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TPipe,
    EnumLabelPipe,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmTextareaImports,
  ],
  templateUrl: './departure-form.html',
})
export class DepartureForm {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(DeparturesApi);
  private readonly router = inject(Router);
  private readonly notify = inject(Notify);
  protected readonly catalog = inject(TourCatalog);
  protected readonly weekdays = WEEKDAYS;
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    tourRefId: ['', Validators.required],
    date: [
      initialDate(inject(ActivatedRoute).snapshot.queryParamMap.get('date')),
      Validators.required,
    ],
    time: ['08:00', Validators.required],
    capacity: [10, [Validators.required, Validators.min(1)]],
    format: ['SHARED' as TourFormat],
    language: ['es'],
    meetingPoint: [''],
    guideName: [''],
    vehicleNote: [''],
    notes: [''],
    cutoffMinutes: [null as number | null, Validators.min(0)],
    repeat: [false],
    until: [''],
    weekdays: [[] as number[]],
  });

  private readonly values = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue(),
    },
  );
  protected readonly repeat = computed(() => !!this.values()?.repeat);
  protected readonly activeTours = computed(() => this.catalog.tours().filter((t) => t.active));
  protected readonly seriesError = computed<'weekdaysRequired' | 'untilBeforeStart' | null>(() => {
    const v = this.values();
    if (!v?.repeat) return null;
    if (!v.weekdays?.length) return 'weekdaysRequired';
    if (!v.until || v.until <= (v.date ?? '')) return 'untilBeforeStart';
    return null;
  });

  constructor() {
    void this.catalog.load().catch((e) => this.notify.error(e));
    // Picking a tour suggests its default capacity.
    this.form.controls.tourRefId.valueChanges.subscribe((id) => {
      const cap = this.catalog.tours().find((t) => t.id === id)?.defaultCapacity;
      if (cap) this.form.controls.capacity.setValue(cap);
    });
  }

  protected toggleWeekday(day: number, checked: boolean) {
    const c = this.form.controls.weekdays;
    c.setValue(checked ? [...c.value, day] : c.value.filter((d) => d !== day));
  }

  protected async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.seriesError()) return;
    this.saving.set(true);
    try {
      const created = await this.api.create(buildCreateDeparture(this.form.getRawValue()));
      if (created.length === 1) {
        this.notify.success('departures.form.createdOne');
        await this.router.navigate(['/departures', created[0].id]);
      } else {
        this.notify.success('departures.form.created', { count: created.length });
        await this.router.navigate(['/departures']);
      }
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }
}
