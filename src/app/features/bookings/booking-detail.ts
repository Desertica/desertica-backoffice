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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { ApiError } from '../../core/api/api-error';
import type { Booking } from '../../core/api/types';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { I18n } from '../../core/i18n/i18n.service';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { useDialogs } from '../../shared/dialog';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { StatusBadge } from '../../shared/status-badge';
import { documentNumber } from '../documents/document-dialogs';
import { DeparturesApi } from '../departures/departures.api';
import { BookingsApi } from './bookings.api';
import {
  CancelBookingDialog,
  ConfirmDialog,
  IssueDocumentDialog,
  ManualPaymentDialog,
  PaymentLinkDialog,
  RescheduleBookingDialog,
} from './booking-dialogs';

/** What is still owed. Never negative, and never mixes currencies: it is the booking's own. */
export function pendingCents(b: Pick<Booking, 'totalCents' | 'paidCents'>): number {
  return Math.max(0, b.totalCents - b.paidCents);
}

/** Which lifecycle actions make sense for a status (the API still validates). */
export function allowedActions(status: Booking['status']) {
  const open = status === 'PENDING_PAYMENT' || status === 'CONFIRMED';
  return {
    cancel: open,
    reschedule: open,
    markStatus: status === 'CONFIRMED',
    collect: open,
    issue: status !== 'CANCELLED' && status !== 'PENDING_PAYMENT',
  };
}

export { documentNumber };

@Component({
  selector: 'app-booking-detail',
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
    HlmCardImports,
    HlmSkeletonImports,
    HlmTableImports,
    HlmTextareaImports,
  ],
  templateUrl: './booking-detail.html',
})
export class BookingDetail {
  readonly id = input.required<string>();

  private readonly api = inject(BookingsApi);
  private readonly departuresApi = inject(DeparturesApi);
  private readonly notify = inject(Notify);
  private readonly i18n = inject(I18n);
  private readonly dialogs = useDialogs();

  protected readonly booking = resource({
    params: () => this.id(),
    loader: ({ params }) => this.api.get(params),
  });
  protected readonly notFound = computed(
    () =>
      this.booking.error() instanceof ApiError &&
      (this.booking.error() as ApiError).statusCode === 404,
  );
  protected readonly actions = computed(() =>
    allowedActions(this.booking.value()?.status ?? 'CANCELLED'),
  );
  protected readonly pending = computed(() =>
    this.booking.value() ? pendingCents(this.booking.value()!) : 0,
  );
  protected readonly notes = new FormControl('', { nonNullable: true });
  protected readonly savingNotes = signal(false);
  protected readonly docNumber = documentNumber;

  constructor() {
    effect(() => this.notes.reset(this.booking.value()?.notes ?? ''));
  }

  protected async saveNotes() {
    const b = this.booking.value();
    if (!b) return;
    this.savingNotes.set(true);
    try {
      await this.api.update(b.id, { notes: this.notes.value });
      this.notify.success('bookings.detail.notesSaved');
      this.booking.reload();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.savingNotes.set(false);
    }
  }

  protected async cancel() {
    const b = this.booking.value()!;
    if (await this.dialogs.open(CancelBookingDialog, { booking: b })) this.booking.reload();
  }

  protected async reschedule() {
    const b = this.booking.value()!;
    try {
      // The reschedule picker needs the tour of the current departure; bookings only carry the departure id.
      const departure = await this.departuresApi.get(b.departureId);
      if (
        await this.dialogs.open(RescheduleBookingDialog, {
          booking: b,
          tourRefId: departure.tourRefId,
        })
      ) {
        this.booking.reload();
      }
    } catch (e) {
      this.notify.error(e);
    }
  }

  protected async mark(status: 'COMPLETED' | 'NO_SHOW') {
    const b = this.booking.value()!;
    const title = this.i18n.t(
      status === 'COMPLETED'
        ? 'bookings.status.complete.confirm'
        : 'bookings.status.noShow.confirm',
    );
    if (!(await this.dialogs.open<boolean>(ConfirmDialog, { title }))) return;
    try {
      await this.api.setStatus(b.id, status);
      this.notify.success('bookings.status.done');
      this.booking.reload();
    } catch (e) {
      this.notify.error(e);
    }
  }

  protected async manualPayment() {
    if (await this.dialogs.open(ManualPaymentDialog, { booking: this.booking.value() }))
      this.booking.reload();
  }

  protected async paymentLink() {
    await this.dialogs.open(PaymentLinkDialog, { booking: this.booking.value() });
  }

  protected async issueDocument() {
    if (await this.dialogs.open(IssueDocumentDialog, { booking: this.booking.value() }))
      this.booking.reload();
  }
}
