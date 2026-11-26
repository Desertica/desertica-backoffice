import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';
import { unwrap } from '../../core/api/api-error';
import type {
  CancellationPolicy,
  PriceRule,
  PriceRuleInput,
  TourRef,
  UpdateTourRef,
} from '../../core/api/types';

/** Tour operational data and prices. The list of tours itself comes from `TourCatalog`. */
@Injectable({ providedIn: 'root' })
export class ToursApi {
  private readonly http = inject(ApiClient).http;

  async get(id: string): Promise<TourRef> {
    return unwrap(await this.http.GET('/tour-refs/{id}', { params: { path: { id } } }));
  }
  async update(id: string, body: UpdateTourRef): Promise<TourRef> {
    return unwrap(await this.http.PATCH('/tour-refs/{id}', { params: { path: { id } }, body }));
  }
  async sync() {
    return unwrap(await this.http.POST('/tour-refs/sync'));
  }
  async listPolicies(): Promise<CancellationPolicy[]> {
    return unwrap(await this.http.GET('/cancellation-policies')).data;
  }

  // shortcut: one page of 100 rules per tour, paginate if a tour ever has more.
  async listPrices(tourRefId: string): Promise<PriceRule[]> {
    return unwrap(
      await this.http.GET('/price-rules', {
        params: { query: { tourRefId, page: 1, pageSize: 100 } },
      }),
    ).data;
  }
  async createPrice(body: PriceRuleInput): Promise<PriceRule> {
    return unwrap(await this.http.POST('/price-rules', { body }));
  }
  async replacePrice(id: string, body: PriceRuleInput): Promise<PriceRule> {
    return unwrap(await this.http.PUT('/price-rules/{id}', { params: { path: { id } }, body }));
  }
  /** The API keeps the rule and marks it inactive. */
  async deactivatePrice(id: string): Promise<void> {
    unwrap(await this.http.DELETE('/price-rules/{id}', { params: { path: { id } } }));
  }
}
