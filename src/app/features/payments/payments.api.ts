import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';
import { unwrap } from '../../core/api/api-error';
import type {
  Dispute,
  DisputeStatus,
  Page,
  Payment,
  PaymentProvider,
  PaymentStatus,
  Refund,
} from '../../core/api/types';

export interface PaymentQuery {
  page?: number;
  pageSize?: number;
  status?: PaymentStatus;
  provider?: PaymentProvider;
  /** ISO instants (UTC). */
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentsApi {
  private readonly http = inject(ApiClient).http;

  async listPayments(query: PaymentQuery): Promise<Page<Payment>> {
    return unwrap(await this.http.GET('/payments', { params: { query } }));
  }

  async listRefunds(query: { page?: number; pageSize?: number }): Promise<Page<Refund>> {
    return unwrap(await this.http.GET('/refunds', { params: { query } }));
  }

  async refund(
    paymentId: string,
    body: { amountCents: number; reason: string },
    idempotencyKey: string,
  ): Promise<Refund> {
    return unwrap(
      await this.http.POST('/payments/{id}/refunds', {
        params: { path: { id: paymentId }, header: { 'Idempotency-Key': idempotencyKey } },
        body,
      }),
    );
  }

  async listDisputes(query: {
    page?: number;
    pageSize?: number;
    status?: DisputeStatus;
  }): Promise<Page<Dispute>> {
    return unwrap(await this.http.GET('/disputes', { params: { query } }));
  }

  async getDispute(id: string): Promise<Dispute> {
    return unwrap(await this.http.GET('/disputes/{id}', { params: { path: { id } } }));
  }

  async updateDispute(
    id: string,
    body: { status?: DisputeStatus; notes?: string },
  ): Promise<Dispute> {
    return unwrap(await this.http.PATCH('/disputes/{id}', { params: { path: { id } }, body }));
  }

  async evidence(id: string): Promise<Blob> {
    return unwrap(
      await this.http.GET('/disputes/{id}/evidence', { params: { path: { id } }, parseAs: 'blob' }),
    ) as Blob;
  }
}
