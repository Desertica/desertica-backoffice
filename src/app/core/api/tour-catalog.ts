import { Injectable, inject, signal } from '@angular/core';
import { ApiClient } from './api-client';
import { unwrap } from './api-error';
import type { TourRef } from './types';

/**
 * Operational tours (`GET /tour-refs`). Departures and bookings only carry the tour id or slug,
 * so screens resolve titles from this cached list. One request per session; `reload()` refreshes.
 */
@Injectable({ providedIn: 'root' })
export class TourCatalog {
  private readonly api = inject(ApiClient);
  private inflight: Promise<TourRef[]> | null = null;

  readonly tours = signal<TourRef[]>([]);

  load(): Promise<TourRef[]> {
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

  titleById(id: string): string | undefined {
    return this.tours().find((t) => t.id === id)?.title;
  }

  titleBySlug(slug: string): string | undefined {
    return this.tours().find((t) => t.slug === slug)?.title;
  }

  private async fetch(): Promise<TourRef[]> {
    const page = unwrap(
      await this.api.http.GET('/tour-refs', { params: { query: { page: 1, pageSize: 100 } } }),
    );
    this.tours.set(page.data);
    return page.data;
  }
}
