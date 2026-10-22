import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { startWith } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { unwrap } from '../../core/api/api-error';
import { TourCatalog } from '../../core/api/tour-catalog';
import type {
  CreateManualBooking,
  Currency,
  IdDocType,
  PassengerInput,
} from '../../core/api/types';
import { AuthService } from '../../core/auth/auth.service';
import { parseToCents } from '../../core/format/money';
import type { MessageKey } from '../../core/i18n/messages.es';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { IdempotencyKeys } from '../../shared/idempotency';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { DeparturesApi } from '../departures/departures.api';
import { BookingsApi } from './bookings.api';

/** Document numbers the SUNAT-facing data needs: DNI has 8 digits, RUC 11. Other types are free text. */
export function idDocNumberError(type: IdDocType, number: string): 'invalid' | null {
  const n = number.trim();
  if (!n) return 'invalid';
  if (type === 'DNI') return /^\d{8}$/.test(n) ? null : 'invalid';
  if (type === 'RUC') return /^\d{11}$/.test(n) ? null : 'invalid';
  return null;
}

export interface ManualBookingForm {
  departureId: string;
  currency: Currency;
  adults: number;
  children: number;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    idDocType: IdDocType;
    idDocNumber: string;
  };
  billingSame: boolean;
  billing: {
    docType: 'BOLETA' | 'FACTURA';
    name: string;
    idDocType: IdDocType;
    idDocNumber: string;
    address: string;
  };
  passengers: { firstName: string; lastName: string; idDocType: IdDocType; idDocNumber: string }[];
  deposit: string;
  override: string;
  notes: string;
  sendConfirmation: boolean;
}

/** Form to API body. Returns `null` when a money field is not a valid amount. */
export function buildManualBooking(v: ManualBookingForm): CreateManualBooking | 'invalidMoney' {
  const c = v.customer;
  const body: CreateManualBooking = {
    departureId: v.departureId,
    currency: v.currency,
    adults: v.adults,
    children: v.children,
    customer: {
      email: c.email.trim(),
      firstName: c.firstName.trim(),
      lastName: c.lastName.trim(),
      ...(c.phone.trim() ? { phone: c.phone.trim() } : {}),
      ...(c.country.trim() ? { country: c.country.trim().toUpperCase() } : {}),
      ...(c.idDocNumber.trim()
        ? { idDocType: c.idDocType, idDocNumber: c.idDocNumber.trim() }
        : {}),
    },
    billing: v.billingSame
      ? {
          docType: v.billing.docType,
          name: `${c.firstName.trim()} ${c.lastName.trim()}`,
          idDocType: c.idDocType,
          idDocNumber: c.idDocNumber.trim(),
          email: c.email.trim(),
        }
      : {
          docType: v.billing.docType,
          name: v.billing.name.trim(),
          idDocType: v.billing.idDocType,
          idDocNumber: v.billing.idDocNumber.trim(),
          ...(v.billing.address.trim() ? { address: v.billing.address.trim() } : {}),
          email: c.email.trim(),
        },
    sendConfirmation: v.sendConfirmation,
  };
  const passengers: PassengerInput[] = v.passengers
    .filter((p) => p.firstName.trim() || p.lastName.trim())
    .map((p) => ({
      firstName: p.firstName.trim(),
      lastName: p.lastName.trim(),
      ...(p.idDocNumber.trim()
        ? { idDocType: p.idDocType, idDocNumber: p.idDocNumber.trim() }
        : {}),
    }));
  if (passengers.length) body.passengers = passengers;
  if (v.notes.trim()) body.notes = v.notes.trim();
  if (v.deposit.trim()) {
    const cents = parseToCents(v.deposit);
    if (cents === null) return 'invalidMoney';
    body.depositCents = cents;
  }
  if (v.override.trim()) {
    const cents = parseToCents(v.override);
    if (cents === null) return 'invalidMoney';
    body.overrideTotalCents = cents;
  }
  return body;
}

@Component({
  selector: 'app-manual-booking',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    MoneyPipe,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmTextareaImports,
  ],
  templateUrl: './manual-booking.html',
})
export class ManualBooking {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly bookings = inject(BookingsApi);
  private readonly departuresApi = inject(DeparturesApi);
  private readonly http = inject(ApiClient).http;
  private readonly router = inject(Router);
  private readonly notify = inject(Notify);
  protected readonly catalog = inject(TourCatalog);
  protected readonly canOverride = inject(AuthService).has('bookings:override');
  protected readonly idDocTypes: readonly IdDocType[] = ['DNI', 'CE', 'PASSPORT', 'RUC'];
  protected readonly currencies: readonly Currency[] = ['USD', 'PEN'];
  protected readonly saving = signal(false);
  protected readonly errors = signal<MessageKey[]>([]);
  private readonly keys = new IdempotencyKeys();

  protected readonly form = this.fb.group({
    tourRefId: ['', Validators.required],
    departureId: ['', Validators.required],
    currency: ['USD' as Currency],
    adults: [1, [Validators.required, Validators.min(1)]],
    children: [0, [Validators.required, Validators.min(0)]],
    customer: this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      country: ['', [Validators.maxLength(2), Validators.minLength(2)]],
      idDocType: ['DNI' as IdDocType],
      idDocNumber: [''],
    }),
    billingSame: [true],
    billing: this.fb.group({
      docType: ['BOLETA' as 'BOLETA' | 'FACTURA'],
      name: [''],
      idDocType: ['DNI' as IdDocType],
      idDocNumber: [''],
      address: [''],
    }),
    passengers: this.fb.array([] as ReturnType<ManualBooking['newPassenger']>[]),
    deposit: [''],
    override: [''],
    notes: [''],
    sendConfirmation: [true],
  });

  private readonly values = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    {
      initialValue: this.form.getRawValue(),
    },
  );
  protected readonly tourId = computed(() => this.values()?.tourRefId ?? '');
  protected readonly departureId = computed(() => this.values()?.departureId ?? '');
  protected readonly people = computed(
    () => (this.values()?.adults ?? 0) + (this.values()?.children ?? 0),
  );
  protected readonly billingSame = computed(() => this.values()?.billingSame ?? true);
  protected readonly activeTours = computed(() => this.catalog.tours().filter((t) => t.active));

  protected readonly departures = resource({
    params: () => (this.tourId() ? this.tourId() : undefined),
    loader: ({ params }) =>
      this.departuresApi.listAll({
        tourRefId: params,
        status: 'OPEN',
        from: new Date().toISOString(),
      }),
  });
  protected readonly available = computed(() =>
    (this.departures.value() ?? []).filter(
      (d) => d.capacity - d.seatsSold - (d.seatsHeld ?? 0) >= Math.max(1, this.people()),
    ),
  );

  /** Compared by value so typing in unrelated fields does not re-quote. */
  private readonly quoteParams = computed(
    () => {
      const v = this.values();
      if (!v?.departureId || (v.adults ?? 0) < 1) return undefined;
      const override = this.canOverride && v.override?.trim() ? parseToCents(v.override) : null;
      return {
        departureId: v.departureId,
        adults: v.adults!,
        children: v.children ?? 0,
        currency: v.currency!,
        ...(override !== null ? { overrideTotalCents: override } : {}),
      };
    },
    { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );
  /** Price for the chosen departure and party (`createStaffQuote`); honours the agreed price only for `bookings:override`. */
  protected readonly quote = resource({
    params: () => this.quoteParams(),
    loader: async ({ params, abortSignal }) =>
      unwrap(await this.http.POST('/bookings/quote', { body: params, signal: abortSignal })),
  });

  constructor() {
    void this.catalog.load().catch((e) => this.notify.error(e));
    // A departure from another tour is no longer valid.
    effect(() => {
      this.tourId();
      this.form.controls.departureId.setValue('', { emitEvent: false });
    });
    this.addPassenger();
  }

  protected newPassenger() {
    return this.fb.group({
      firstName: [''],
      lastName: [''],
      idDocType: ['DNI' as IdDocType],
      idDocNumber: [''],
    });
  }

  protected get passengers(): FormArray {
    return this.form.controls.passengers as unknown as FormArray;
  }

  protected addPassenger() {
    this.passengers.push(this.newPassenger());
  }

  protected removePassenger(i: number) {
    this.passengers.removeAt(i);
  }

  protected docError(type: IdDocType, number: string) {
    return idDocNumberError(type, number);
  }

  protected async submit() {
    this.form.markAllAsTouched();
    const v = this.form.getRawValue() as unknown as ManualBookingForm;
    const customerDocBad =
      v.customer.idDocNumber.trim() !== '' &&
      idDocNumberError(v.customer.idDocType, v.customer.idDocNumber);
    const billing = v.billingSame
      ? { type: v.customer.idDocType, number: v.customer.idDocNumber }
      : { type: v.billing.idDocType, number: v.billing.idDocNumber };
    const billingBad = idDocNumberError(billing.type, billing.number);
    const nameMissing = !v.billingSame && !v.billing.name.trim();
    const facturaNeedsRuc = v.billing.docType === 'FACTURA' && billing.type !== 'RUC';
    const errors: MessageKey[] = [];
    if (this.form.invalid) errors.push('common.required');
    if (customerDocBad || billingBad) errors.push('bookings.new.docInvalid');
    if (nameMissing) errors.push('bookings.new.billingNameMissing');
    if (facturaNeedsRuc) errors.push('bookings.new.facturaRuc');
    this.errors.set(errors);
    if (errors.length) return;
    const body = buildManualBooking(v);
    if (body === 'invalidMoney') {
      this.errors.set(['bookings.new.invalidMoney']);
      return;
    }
    this.saving.set(true);
    try {
      const booking = await this.bookings.createManual(body, this.keys.keyFor(body));
      this.notify.success('bookings.new.created', { reference: booking.reference });
      await this.router.navigate(['/bookings', booking.id]);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }
}
