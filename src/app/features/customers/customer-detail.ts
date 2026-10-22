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
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { ApiError } from '../../core/api/api-error';
import type { CustomerInput, IdDocType } from '../../core/api/types';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { StatusBadge } from '../../shared/status-badge';
import { CustomersApi } from './customers.api';

/** Trims the form and drops empty optionals; the API treats an absent field as "unchanged". */
export function buildCustomerUpdate(v: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  idDocType: IdDocType;
  idDocNumber: string;
  locale: string;
}): CustomerInput {
  return {
    email: v.email.trim(),
    firstName: v.firstName.trim(),
    lastName: v.lastName.trim(),
    ...(v.phone.trim() ? { phone: v.phone.trim() } : {}),
    ...(v.country.trim() ? { country: v.country.trim().toUpperCase() } : {}),
    ...(v.idDocNumber.trim() ? { idDocType: v.idDocType, idDocNumber: v.idDocNumber.trim() } : {}),
    ...(v.locale.trim() ? { locale: v.locale.trim() } : {}),
  };
}

@Component({
  selector: 'app-customer-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    MoneyPipe,
    StatusBadge,
    HasPermissionDirective,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  template: `
    <div class="space-y-6">
      <a hlmBtn variant="ghost" size="sm" routerLink="/customers">← {{ 'customers.title' | t }}</a>
      @if (notFound()) {
        <p class="text-muted-foreground">{{ 'customers.detail.notFound' | t }}</p>
      } @else if (customer.error()) {
        <div class="flex items-center gap-3 text-sm text-destructive" role="alert">
          {{ 'common.error.generic' | t }}
          <button hlmBtn size="sm" variant="outline" (click)="customer.reload()">
            {{ 'common.retry' | t }}
          </button>
        </div>
      } @else if (customer.value(); as c) {
        <h1 class="text-2xl font-semibold">{{ c.firstName }} {{ c.lastName }}</h1>

        <form
          [formGroup]="form"
          (ngSubmit)="save()"
          class="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2"
          novalidate
        >
          <h2 class="text-lg font-medium sm:col-span-2">{{ 'customers.detail.data' | t }}</h2>
          <label class="grid gap-1.5"
            ><span hlmLabel>{{ 'bookings.new.firstName' | t }}</span
            ><input hlmInput formControlName="firstName"
          /></label>
          <label class="grid gap-1.5"
            ><span hlmLabel>{{ 'bookings.new.lastName' | t }}</span
            ><input hlmInput formControlName="lastName"
          /></label>
          <label class="grid gap-1.5">
            <span hlmLabel>{{ 'bookings.new.email' | t }}</span>
            <input hlmInput type="email" formControlName="email" />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <span class="text-xs text-destructive">{{ 'common.invalidEmail' | t }}</span>
            }
          </label>
          <label class="grid gap-1.5"
            ><span hlmLabel>{{ 'bookings.new.phone' | t }}</span
            ><input hlmInput type="tel" formControlName="phone"
          /></label>
          <label class="grid gap-1.5"
            ><span hlmLabel>{{ 'bookings.new.country' | t }}</span
            ><input hlmInput maxlength="2" class="uppercase" formControlName="country"
          /></label>
          <label class="grid gap-1.5"
            ><span hlmLabel>{{ 'customers.detail.locale' | t }}</span
            ><input hlmInput maxlength="5" formControlName="locale"
          /></label>
          <label class="grid gap-1.5">
            <span hlmLabel>{{ 'bookings.new.idDocType' | t }}</span>
            <select hlmInput formControlName="idDocType">
              @for (t of idDocTypes; track t) {
                <option [value]="t">{{ t | enumLabel: 'enum.idDocType' }}</option>
              }
            </select>
          </label>
          <label class="grid gap-1.5"
            ><span hlmLabel>{{ 'bookings.new.idDocNumber' | t }}</span
            ><input hlmInput formControlName="idDocNumber"
          /></label>
          <div *appHasPermission="'customers:write'" class="flex justify-end sm:col-span-2">
            <button hlmBtn type="submit" [disabled]="saving() || form.invalid || form.pristine">
              {{ 'common.save' | t }}
            </button>
          </div>
        </form>

        <section aria-labelledby="hist-h" class="space-y-2">
          <h2 id="hist-h" class="text-lg font-medium">{{ 'customers.detail.history' | t }}</h2>
          @if (!c.bookings?.length) {
            <p class="text-sm text-muted-foreground">{{ 'customers.detail.noBookings' | t }}</p>
          } @else {
            <div hlmTableContainer>
              <table hlmTable>
                <thead hlmTHead>
                  <tr hlmTr>
                    <th hlmTh>{{ 'bookings.col.reference' | t }}</th>
                    <th hlmTh>{{ 'bookings.col.departure' | t }}</th>
                    <th hlmTh>{{ 'bookings.col.status' | t }}</th>
                    <th hlmTh class="text-right">{{ 'bookings.col.paid' | t }}</th>
                  </tr>
                </thead>
                <tbody hlmTBody>
                  @for (b of c.bookings; track b.id) {
                    <tr hlmTr>
                      <td hlmTd>
                        <a [routerLink]="['/bookings', b.id]" class="font-medium hover:underline">{{
                          b.reference
                        }}</a>
                      </td>
                      <td hlmTd>{{ b.startsAt | limaDateTime }}</td>
                      <td hlmTd><app-status-badge kind="booking" [value]="b.status" /></td>
                      <td hlmTd class="text-right">
                        {{ b.paidCents | money: b.currency }} /
                        {{ b.totalCents | money: b.currency }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      } @else {
        <hlm-skeleton class="h-48" />
      }
    </div>
  `,
})
export class CustomerDetail {
  readonly id = input.required<string>();

  private readonly api = inject(CustomersApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly idDocTypes: readonly IdDocType[] = ['DNI', 'CE', 'PASSPORT', 'RUC'];
  protected readonly saving = signal(false);

  protected readonly customer = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.get(params),
  });
  protected readonly notFound = computed(
    () =>
      this.customer.error() instanceof ApiError &&
      (this.customer.error() as ApiError).statusCode === 404,
  );
  protected readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    country: ['', [Validators.minLength(2), Validators.maxLength(2)]],
    idDocType: ['DNI' as IdDocType],
    idDocNumber: [''],
    locale: [''],
  });

  constructor() {
    effect(() => {
      const c = this.customer.value();
      if (c)
        this.form.reset({
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone ?? '',
          country: c.country ?? '',
          idDocType: c.idDocType ?? 'DNI',
          idDocNumber: c.idDocNumber ?? '',
          locale: c.locale ?? '',
        });
    });
  }

  protected async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving.set(true);
    try {
      await this.api.update(this.id(), buildCustomerUpdate(this.form.getRawValue()));
      this.notify.success('customers.detail.saved');
      this.customer.reload();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.saving.set(false);
    }
  }
}
