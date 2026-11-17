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
import { type AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { ApiError } from '../../core/api/api-error';
import type { Currency, PriceRule, PriceUnit, TourFormat, TourOffer } from '../../core/api/types';
import { AuthService } from '../../core/auth/auth.service';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { wholeNumber } from '../../shared/validators';
import {
  EMPTY_PRICE,
  type PriceError,
  buildPriceRule,
  buildUpdateTourRef,
  parseLanguages,
  priceToForm,
  tourToForm,
} from './tour-model';
import { ToursApi } from './tours.api';

@Component({
  selector: 'app-tour-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    MoneyPipe,
    HasPermissionDirective,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSkeletonImports,
    HlmTableImports,
    HlmTextareaImports,
  ],
  templateUrl: './tour-detail.html',
})
export class TourDetail {
  /** Bound from the route (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  private readonly api = inject(ToursApi);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly offers: readonly TourOffer[] = ['SHARED', 'PRIVATE', 'BOTH'];
  protected readonly formats: readonly TourFormat[] = ['SHARED', 'PRIVATE'];
  protected readonly units: readonly PriceUnit[] = ['PER_PERSON', 'PER_GROUP'];
  protected readonly currencies: readonly Currency[] = ['USD', 'PEN'];

  protected readonly tour = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.get(params),
  });
  protected readonly policies = resource({ loader: () => this.api.listPolicies() });
  protected readonly prices = resource({
    params: () => this.id(),
    loader: async ({ params }) => (this.auth.has('prices:read') ? this.api.listPrices(params) : []),
  });
  protected readonly notFound = computed(
    () =>
      this.tour.error() instanceof ApiError && (this.tour.error() as ApiError).statusCode === 404,
  );
  /** Policies in force, plus the one the tour already has even if it was retired. */
  protected readonly policyOptions = computed(() => {
    const current = this.tour.value()?.cancellationPolicyId;
    return (this.policies.value() ?? []).filter((p) => p.active || p.id === current);
  });

  protected readonly saving = signal(false);
  protected readonly form = this.fb.group({
    active: [false],
    requiresWaiver: [false],
    durationHours: [null as number | null, [Validators.min(1), Validators.max(240), wholeNumber]],
    format: ['' as TourOffer | ''],
    languages: ['', (c: AbstractControl) => (parseLanguages(c.value) ? null : { languages: true })],
    meetingPointEs: ['', Validators.maxLength(2000)],
    meetingPointEn: ['', Validators.maxLength(2000)],
    meetingPointUrl: [
      '',
      [Validators.pattern(/^\s*(https?:\/\/\S+)?\s*$/), Validators.maxLength(500)],
    ],
    latitude: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]],
    minAge: [null as number | null, [Validators.min(0), wholeNumber]],
    minHeightCm: [null as number | null, [Validators.min(0), wholeNumber]],
    defaultCapacity: [null as number | null, [Validators.min(1), wholeNumber]],
    cancellationPolicyId: [''],
  });

  /** The rule being edited; `null` means the form creates a new one. */
  protected readonly editingPrice = signal<PriceRule | null>(null);
  protected readonly priceError = signal<PriceError | 'invalid' | null>(null);
  protected readonly priceErrorKey = computed(() => {
    const e = this.priceError();
    return e ? (`tours.price.error.${e}` as const) : null;
  });
  protected readonly savingPrice = signal(false);
  protected readonly priceForm = this.fb.group({
    currency: [EMPTY_PRICE.currency],
    format: [EMPTY_PRICE.format],
    unit: [EMPTY_PRICE.unit],
    adult: [''],
    child: [''],
    group: [''],
    minPeople: [null as number | null, [Validators.min(1), wholeNumber]],
    maxPeople: [null as number | null, [Validators.min(1), wholeNumber]],
    validFrom: [''],
    validTo: [''],
    priority: [0 as number | null, wholeNumber],
    active: [true],
  });

  constructor() {
    if (!this.auth.has('catalog:write')) this.form.disable();
    effect(() => {
      const t = this.tour.value();
      if (t) this.form.reset(tourToForm(t));
    });
  }

  protected async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      this.tour.set(await this.api.update(this.id(), buildUpdateTourRef(this.form.getRawValue())));
      this.notify.success('common.saved');
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }

  protected editPrice(rule: PriceRule | null) {
    this.editingPrice.set(rule);
    this.priceError.set(null);
    this.priceForm.reset(rule ? priceToForm(rule) : EMPTY_PRICE);
  }

  protected async savePrice() {
    const result = this.priceForm.invalid
      ? { error: 'invalid' as const }
      : buildPriceRule(this.id(), this.priceForm.getRawValue());
    this.priceError.set('error' in result ? result.error : null);
    if ('error' in result) return;
    this.savingPrice.set(true);
    try {
      const editing = this.editingPrice();
      if (editing) await this.api.replacePrice(editing.id, result.value);
      else await this.api.createPrice(result.value);
      this.notify.success('tours.price.saved');
      this.editPrice(null);
      this.prices.reload();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.savingPrice.set(false);
    }
  }

  protected async deactivatePrice(rule: PriceRule) {
    try {
      await this.api.deactivatePrice(rule.id);
      this.notify.success('tours.price.deactivated');
      if (this.editingPrice()?.id === rule.id) this.editPrice(null);
      this.prices.reload();
    } catch (e) {
      this.notify.error(e);
    }
  }
}
