import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';
import { unwrap } from '../../core/api/api-error';
import type {
  Booking,
  BookingStatus,
  BookingSummary,
  CreateManualBooking,
  Currency,
  Page,
  PaymentKind,
  UpdateBooking,
} from '../../core/api/types';

export interface BookingQuery {
  page?: number;
  pageSize?: number;
  status?: BookingStatus;
  departureId?: string;
  tourRefId?: string;
  /** ISO instants (UTC). */
  from?: string;
  to?: string;
  q?: string;
}

@Injectable({ providedIn: 'root' })
export class BookingsApi {
  private readonly http = inject(ApiClient).http;

  async list(query: BookingQuery): Promise<Page<BookingSummary>> {
    return unwrap(await this.http.GET('/bookings', { params: { query } }));
  }

  async get(id: string): Promise<Booking> {
    return unwrap(await this.http.GET('/bookings/{id}', { params: { path: { id } } }));
  }

  /** `idempotencyKey` makes a double click or retry return the first booking instead of creating a second one. */
  async createManual(body: CreateManualBooking, idempotencyKey: string): Promise<Booking> {
    return unwrap(
      await this.http.POST('/bookings', {
        params: { header: { 'Idempotency-Key': idempotencyKey } },
        body,
      }),
    );
  }

  async update(id: string, body: UpdateBooking): Promise<Booking> {
    return unwrap(await this.http.PATCH('/bookings/{id}', { params: { path: { id } }, body }));
  }

  async cancel(
    id: string,
    body: { reason: string; refund: 'POLICY' | 'FULL' | 'NONE' },
  ): Promise<Booking> {
    return unwrap(
      await this.http.POST('/bookings/{id}/cancel', { params: { path: { id } }, body }),
    );
  }

  async reschedule(id: string, body: { targetDepartureId: string; reason?: string }) {
    return unwrap(
      await this.http.POST('/bookings/{id}/reschedule', { params: { path: { id } }, body }),
    );
  }

  async setStatus(id: string, status: 'COMPLETED' | 'NO_SHOW'): Promise<Booking> {
    return unwrap(
      await this.http.POST('/bookings/{id}/status', { params: { path: { id } }, body: { status } }),
    );
  }

  async createPaymentLink(
    id: string,
    body: { kind: PaymentKind; amountCents?: number; expiresInHours?: number },
  ) {
    return unwrap(
      await this.http.POST('/bookings/{id}/payment-links', { params: { path: { id } }, body }),
    );
  }

  async recordManualPayment(
    id: string,
    body: {
      method: 'CASH' | 'TRANSFER' | 'YAPE' | 'OTHER';
      kind: PaymentKind;
      amountCents: number;
      currency: Currency;
      reference?: string;
      paidAt?: string;
    },
    idempotencyKey: string,
  ) {
    return unwrap(
      await this.http.POST('/bookings/{id}/payments/manual', {
        params: { path: { id }, header: { 'Idempotency-Key': idempotencyKey } },
        body,
      }),
    );
  }

  async issueDocument(
    id: string,
    body: { paymentId?: string; docType?: 'BOLETA' | 'FACTURA' },
    idempotencyKey: string,
  ) {
    return unwrap(
      await this.http.POST('/bookings/{id}/documents', {
        params: { path: { id }, header: { 'Idempotency-Key': idempotencyKey } },
        body,
      }),
    );
  }
}
