import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { ApiClient } from './api-client';
import { unwrap } from './api-error';
import type { TourRef } from './types';

/**
 * Operational tours (`GET /tour-refs`, needs `catalog:read`). Only used to fill tour selectors:
 * departures and bookings carry their own `tourTitle`. One request per session; `reload()` refreshes.
 */
@Injectable({ providedIn: 'root' })
export class TourCatalog {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);
  private inflight: Promise<TourRef[]> | null = null;

  readonly tours = signal<TourRef[]>([]);

  load(): Promise<TourRef[]> {
    if (!this.auth.has('catalog:read')) return Promise.resolve([]);
    this.inflight ??= this.fetch().catch((e) => {
      this.inflight = null;
      throw e;
    });
    return this.inflight;
  }

  reload(): Promise<TourRef[]> {
    this.inflight = null;
    return this.load();
  }

  private async fetch(): Promise<TourRef[]> {
    const page = unwrap(
      await this.api.http.GET('/tour-refs', { params: { query: { page: 1, pageSize: 100 } } }),
    );
    this.tours.set(page.data);
    return page.data;
  }
}
