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
import type { Booking, Departure, Payment, PaymentKind, PaymentLink } from '../../core/api/types';
import { AuthService } from '../../core/auth/auth.service';
import { limaToUtcIso } from '../../core/format/datetime';
import { centsToInput, parseToCents } from '../../core/format/money';
import { I18n } from '../../core/i18n/i18n.service';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { injectDialog } from '../../shared/dialog';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { DeparturesApi } from '../departures/departures.api';
import { BookingsApi } from './bookings.api';

const COMMON = [
  ReactiveFormsModule,
  TPipe,
  HlmButtonImports,
  HlmDialogImports,
  HlmInputImports,
  HlmLabelImports,
  HlmTextareaImports,
];

/** A fresh key per dialog open: retries of the same submit reuse it, so a double click cannot pay twice. */
const newKey = () => crypto.randomUUID();

// ---------------------------------------------------------------- cancel

@Component({
  selector: 'app-cancel-booking-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: COMMON,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4" novalidate>
      <hlm-dialog-header>
        <h2 hlmDialogTitle>{{ 'bookings.cancel.title' | t: { reference: booking.reference } }}</h2>
        <p hlmDialogDescription>{{ 'bookings.cancel.policyHint' | t }}</p>
      </hlm-dialog-header>
      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'bookings.cancel.reason' | t }}</span>
        <textarea hlmTextarea rows="2" formControlName="reason"></textarea>
        @if (form.controls.reason.touched && form.controls.reason.invalid) {
          <span class="text-xs text-destructive">{{ 'common.required' | t }}</span>
        }
      </label>
      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'bookings.cancel.refund' | t }}</span>
        <select hlmInput formControlName="refund">
          <option value="POLICY">{{ 'bookings.cancel.refund.POLICY' | t }}</option>
          @if (canOverride) {
            <option value="FULL">{{ 'bookings.cancel.refund.FULL' | t }}</option>
            <option value="NONE">{{ 'bookings.cancel.refund.NONE' | t }}</option>
          }
        </select>
      </label>
      <hlm-dialog-footer>
        <button hlmBtn type="button" variant="outline" (click)="dialog.close()">
          {{ 'common.cancel' | t }}
        </button>
        <button hlmBtn type="submit" variant="destructive" [disabled]="busy()">
          {{ 'bookings.cancel.confirm' | t }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class CancelBookingDialog {
  protected readonly dialog = injectDialog<{ booking: Booking }, Booking>();
  private readonly api = inject(BookingsApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly booking = this.dialog.context.booking;
  /** Forcing FULL/NONE needs `bookings:override`; the API enforces it too. */
  protected readonly canOverride = inject(AuthService).has('bookings:override');
  protected readonly busy = signal(false);
  protected readonly form = this.fb.group({
    reason: ['', Validators.required],
    refund: ['POLICY' as 'POLICY' | 'FULL' | 'NONE'],
  });

  protected async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    try {
      const v = this.form.getRawValue();
      const booking = await this.api.cancel(this.booking.id, {
        reason: v.reason.trim(),
        refund: v.refund,
      });
      this.notify.success('bookings.cancel.done');
      this.dialog.close(booking);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}

// ------------------------------------------------------------ reschedule

/** Open departures of the same tour, other than the current one, with room for the whole party. */
export function rescheduleTargets(
  all: Departure[],
  currentId: string,
  people: number,
): Departure[] {
  return all.filter(
    (d) =>
      d.id !== currentId &&
      d.status === 'OPEN' &&
      d.capacity - d.seatsSold - (d.seatsHeld ?? 0) >= people,
  );
}

@Component({
  selector: 'app-reschedule-booking-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...COMMON, LimaDateTimePipe],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4" novalidate>
      <hlm-dialog-header>
        <h2 hlmDialogTitle>
          {{ 'bookings.reschedule.title' | t: { reference: booking.reference } }}
        </h2>
      </hlm-dialog-header>
      @if (targets().length === 0 && !candidates.isLoading()) {
        <p class="text-sm text-destructive">
          {{ 'bookings.reschedule.none' | t: { count: people } }}
        </p>
      } @else {
        <label class="grid gap-1.5">
          <span hlmLabel>{{ 'bookings.reschedule.target' | t }}</span>
          <select hlmInput formControlName="targetDepartureId">
            <option value="">{{ 'bookings.reschedule.placeholder' | t }}</option>
            @for (d of targets(); track d.id) {
              <option [value]="d.id">
                {{ d.startsAt | limaDateTime }} ·
                {{ 'bookings.new.seatsLeft' | t: { count: d.capacity - d.seatsSold } }}
              </option>
            }
          </select>
        </label>
        <label class="grid gap-1.5">
          <span hlmLabel>{{ 'bookings.reschedule.reason' | t }}</span>
          <textarea hlmTextarea rows="2" formControlName="reason"></textarea>
        </label>
      }
      <hlm-dialog-footer>
        <button hlmBtn type="button" variant="outline" (click)="dialog.close()">
          {{ 'common.cancel' | t }}
        </button>
        <button hlmBtn type="submit" [disabled]="busy() || !form.controls.targetDepartureId.value">
          {{ 'bookings.reschedule.confirm' | t }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class RescheduleBookingDialog {
  protected readonly dialog = injectDialog<{ booking: Booking; tourRefId: string }, boolean>();
  private readonly api = inject(BookingsApi);
  private readonly departures = inject(DeparturesApi);
  private readonly notify = inject(Notify);
  private readonly i18n = inject(I18n);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly booking = this.dialog.context.booking;
  protected readonly people = (this.booking.adults ?? 0) + (this.booking.children ?? 0);
  protected readonly busy = signal(false);
  protected readonly form = this.fb.group({ targetDepartureId: [''], reason: [''] });

  protected readonly candidates = resource({
    loader: () =>
      this.departures.listAll({
        tourRefId: this.dialog.context.tourRefId,
        status: 'OPEN',
        from: new Date().toISOString(),
      }),
  });
  protected readonly targets = computed(() =>
    rescheduleTargets(this.candidates.value() ?? [], this.booking.departureId, this.people),
  );

  protected async submit() {
    const v = this.form.getRawValue();
    if (!v.targetDepartureId) return;
    this.busy.set(true);
    try {
      const res = await this.api.reschedule(this.booking.id, {
        targetDepartureId: v.targetDepartureId,
        ...(v.reason.trim() ? { reason: v.reason.trim() } : {}),
      });
      this.notify.success('bookings.reschedule.done');
      const adj = res.adjustment;
      if (adj?.amountCents) {
        // Price changed: tell staff what to collect or return, in the booking's currency.
        const amount = new Intl.NumberFormat(this.i18n.locale, {
          style: 'currency',
          currency: this.booking.currency,
        }).format(adj.amountCents / 100);
        this.notify.success(
          adj.type === 'CHARGE' ? 'bookings.reschedule.charge' : 'bookings.reschedule.refund',
          { amount },
        );
      }
      this.dialog.close(true);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}

// -------------------------------------------------------- manual payment

export function buildManualPayment(
  v: {
    method: 'CASH' | 'TRANSFER' | 'YAPE' | 'OTHER';
    kind: PaymentKind;
    amount: string;
    reference: string;
    paidAt: string;
  },
  currency: Booking['currency'],
) {
  const amountCents = parseToCents(v.amount);
  if (!amountCents || amountCents < 1) return null;
  return {
    method: v.method,
    kind: v.kind,
    amountCents,
    currency,
    ...(v.reference.trim() ? { reference: v.reference.trim() } : {}),
    // `datetime-local` has no zone: it is Lima wall-clock time.
    ...(v.paidAt ? { paidAt: limaToUtcIso(v.paidAt.slice(0, 10), v.paidAt.slice(11, 16)) } : {}),
  };
}

@Component({
  selector: 'app-manual-payment-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...COMMON, EnumLabelPipe],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4" novalidate>
      <hlm-dialog-header
        ><h2 hlmDialogTitle>{{ 'bookings.payment.title' | t }}</h2></hlm-dialog-header
      >
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-1.5">
          <span hlmLabel>{{ 'bookings.payment.method' | t }}</span>
          <select hlmInput formControlName="method">
            @for (m of methods; track m) {
              <option [value]="m">{{ m | enumLabel: 'enum.paymentMethod' }}</option>
            }
          </select>
        </label>
        <label class="grid gap-1.5">
          <span hlmLabel>{{ 'bookings.payment.kind' | t }}</span>
          <select hlmInput formControlName="kind">
            @for (k of kinds; track k) {
              <option [value]="k">{{ k | enumLabel: 'enum.paymentKind' }}</option>
            }
          </select>
        </label>
        <label class="grid gap-1.5">
          <span hlmLabel>{{ 'bookings.payment.amount' | t: { currency: booking.currency } }}</span>
          <input hlmInput inputmode="decimal" formControlName="amount" />
          @if (form.controls.amount.touched && !valid()) {
            <span class="text-xs text-destructive">{{ 'bookings.payment.invalidAmount' | t }}</span>
          }
        </label>
        <label class="grid gap-1.5">
          <span hlmLabel>{{ 'bookings.payment.paidAt' | t }} ({{ 'common.optional' | t }})</span>
          <input hlmInput type="datetime-local" formControlName="paidAt" />
        </label>
        <label class="grid gap-1.5 sm:col-span-2">
          <span hlmLabel>{{ 'bookings.payment.reference' | t }} ({{ 'common.optional' | t }})</span>
          <input hlmInput formControlName="reference" />
        </label>
      </div>
      <hlm-dialog-footer>
        <button hlmBtn type="button" variant="outline" (click)="dialog.close()">
          {{ 'common.cancel' | t }}
        </button>
        <button hlmBtn type="submit" [disabled]="busy()">
          {{ 'bookings.payment.confirm' | t }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class ManualPaymentDialog {
  protected readonly dialog = injectDialog<{ booking: Booking }, Payment>();
  private readonly api = inject(BookingsApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly idempotencyKey = newKey();
  protected readonly booking = this.dialog.context.booking;
  protected readonly methods = ['CASH', 'TRANSFER', 'YAPE', 'OTHER'] as const;
  protected readonly kinds: readonly PaymentKind[] = ['FULL', 'DEPOSIT', 'BALANCE'];
  protected readonly busy = signal(false);
  protected readonly form = this.fb.group({
    method: ['CASH' as (typeof this.methods)[number]],
    kind: [(this.booking.paidCents > 0 ? 'BALANCE' : 'FULL') as PaymentKind],
    amount: [centsToInput(Math.max(0, this.booking.totalCents - this.booking.paidCents))],
    reference: [''],
    paidAt: [''],
  });

  protected valid() {
    return buildManualPayment(this.form.getRawValue(), this.booking.currency) !== null;
  }

  protected async submit() {
    this.form.markAllAsTouched();
    const body = buildManualPayment(this.form.getRawValue(), this.booking.currency);
    if (!body) return;
    this.busy.set(true);
    try {
      const payment = await this.api.recordManualPayment(
        this.booking.id,
        body,
        this.idempotencyKey,
      );
      this.notify.success('bookings.payment.done');
      this.dialog.close(payment);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}

// ---------------------------------------------------------- payment link

@Component({
  selector: 'app-payment-link-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...COMMON, EnumLabelPipe, LimaDateTimePipe, MoneyPipe],
  template: `
    <div class="grid gap-4">
      <hlm-dialog-header
        ><h2 hlmDialogTitle>{{ 'bookings.link.title' | t }}</h2></hlm-dialog-header
      >
      @if (link(); as l) {
        <div class="grid gap-2" role="status">
          <p class="font-medium">
            {{ 'bookings.link.ready' | t }} · {{ l.amountCents | money: l.currency }}
          </p>
          <div class="flex gap-2">
            <input hlmInput readonly [value]="l.url" (focus)="$any($event.target).select()" />
            <button hlmBtn type="button" variant="outline" (click)="copy(l.url)">
              {{ 'common.copy' | t }}
            </button>
          </div>
          <p class="text-xs text-muted-foreground">
            {{ 'bookings.link.expiresAt' | t: { date: (l.expiresAt | limaDateTime) } }}
          </p>
        </div>
        <hlm-dialog-footer
          ><button hlmBtn type="button" (click)="dialog.close(l)">
            {{ 'common.close' | t }}
          </button></hlm-dialog-footer
        >
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4" novalidate>
          <label class="grid gap-1.5">
            <span hlmLabel>{{ 'bookings.link.kind' | t }}</span>
            <select hlmInput formControlName="kind">
              @for (k of kinds; track k) {
                <option [value]="k">{{ k | enumLabel: 'enum.paymentKind' }}</option>
              }
            </select>
          </label>
          <label class="grid gap-1.5">
            <span hlmLabel>{{ 'bookings.link.amount' | t: { currency: booking.currency } }}</span>
            <input hlmInput inputmode="decimal" formControlName="amount" />
            <span class="text-xs text-muted-foreground">{{ 'bookings.link.amountHint' | t }}</span>
            @if (form.controls.amount.value && amountInvalid()) {
              <span class="text-xs text-destructive">{{
                'bookings.payment.invalidAmount' | t
              }}</span>
            }
          </label>
          <label class="grid gap-1.5">
            <span hlmLabel>{{ 'bookings.link.expires' | t }}</span>
            <input hlmInput type="number" min="1" max="720" formControlName="expiresInHours" />
          </label>
          <hlm-dialog-footer>
            <button hlmBtn type="button" variant="outline" (click)="dialog.close()">
              {{ 'common.cancel' | t }}
            </button>
            <button hlmBtn type="submit" [disabled]="busy() || amountInvalid()">
              {{ 'bookings.link.confirm' | t }}
            </button>
          </hlm-dialog-footer>
        </form>
      }
    </div>
  `,
})
export class PaymentLinkDialog {
  protected readonly dialog = injectDialog<{ booking: Booking }, PaymentLink>();
  private readonly api = inject(BookingsApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly booking = this.dialog.context.booking;
  protected readonly kinds: readonly PaymentKind[] = ['FULL', 'DEPOSIT', 'BALANCE'];
  protected readonly busy = signal(false);
  protected readonly link = signal<PaymentLink | null>(null);
  protected readonly form = this.fb.group({
    kind: [(this.booking.paidCents > 0 ? 'BALANCE' : 'FULL') as PaymentKind],
    amount: [''],
    expiresInHours: [48, [Validators.min(1), Validators.max(720)]],
  });

  protected amountInvalid() {
    const raw = this.form.controls.amount.value.trim();
    if (!raw) return false;
    const cents = parseToCents(raw);
    return cents === null || cents < 1;
  }

  protected async submit() {
    const v = this.form.getRawValue();
    if (this.amountInvalid() || this.form.invalid) return;
    this.busy.set(true);
    try {
      const amountCents = v.amount.trim() ? parseToCents(v.amount)! : undefined;
      this.link.set(
        await this.api.createPaymentLink(this.booking.id, {
          kind: v.kind,
          expiresInHours: v.expiresInHours,
          ...(amountCents ? { amountCents } : {}),
        }),
      );
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }

  protected async copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      this.notify.success('common.copied');
    } catch {
      /* clipboard blocked: the field is selectable */
    }
  }
}

// -------------------------------------------------------- issue document

@Component({
  selector: 'app-issue-document-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...COMMON, EnumLabelPipe, MoneyPipe],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4">
      <hlm-dialog-header
        ><h2 hlmDialogTitle>{{ 'bookings.doc.title' | t }}</h2></hlm-dialog-header
      >
      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'bookings.doc.docType' | t }}</span>
        <select hlmInput formControlName="docType">
          <option value="">{{ 'bookings.doc.default' | t }}</option>
          <option value="BOLETA">{{ 'BOLETA' | enumLabel: 'enum.docType' }}</option>
          <option value="FACTURA">{{ 'FACTURA' | enumLabel: 'enum.docType' }}</option>
        </select>
      </label>
      <label class="grid gap-1.5">
        <span hlmLabel>{{ 'bookings.doc.payment' | t }}</span>
        <select hlmInput formControlName="paymentId">
          <option value="">{{ 'bookings.doc.allPaid' | t }}</option>
          @for (p of payments; track p.id) {
            <option [value]="p.id">
              {{ p.kind | enumLabel: 'enum.paymentKind' }} · {{ p.amountCents | money: p.currency }}
            </option>
          }
        </select>
      </label>
      <hlm-dialog-footer>
        <button hlmBtn type="button" variant="outline" (click)="dialog.close()">
          {{ 'common.cancel' | t }}
        </button>
        <button hlmBtn type="submit" [disabled]="busy()">{{ 'bookings.doc.confirm' | t }}</button>
      </hlm-dialog-footer>
    </form>
  `,
})
export class IssueDocumentDialog {
  protected readonly dialog = injectDialog<{ booking: Booking }, boolean>();
  private readonly api = inject(BookingsApi);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly idempotencyKey = newKey();
  protected readonly booking = this.dialog.context.booking;
  protected readonly payments = (this.booking.payments ?? []).filter(
    (p) => p.status === 'SUCCEEDED',
  );
  protected readonly busy = signal(false);
  protected readonly form = this.fb.group({ docType: [''], paymentId: [''] });

  protected async submit() {
    const v = this.form.getRawValue();
    this.busy.set(true);
    try {
      await this.api.issueDocument(
        this.booking.id,
        {
          ...(v.docType ? { docType: v.docType as 'BOLETA' | 'FACTURA' } : {}),
          ...(v.paymentId ? { paymentId: v.paymentId } : {}),
        },
        this.idempotencyKey,
      );
      this.notify.success('bookings.doc.queued');
      this.dialog.close(true);
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.busy.set(false);
    }
  }
}

// ---------------------------------------------------------------- confirm

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, HlmButtonImports, HlmDialogImports],
  template: `
    <hlm-dialog-header
      ><h2 hlmDialogTitle>{{ dialog.context.title }}</h2></hlm-dialog-header
    >
    <hlm-dialog-footer>
      <button hlmBtn type="button" variant="outline" (click)="dialog.close(false)">
        {{ 'common.cancel' | t }}
      </button>
      <button hlmBtn type="button" (click)="dialog.close(true)">{{ 'common.confirm' | t }}</button>
    </hlm-dialog-footer>
  `,
})
export class ConfirmDialog {
  protected readonly dialog = injectDialog<{ title: string }, boolean>();
}
