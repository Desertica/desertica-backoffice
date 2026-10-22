import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';
import { unwrap } from '../../core/api/api-error';
import type {
  CreateDeparture,
  Departure,
  DepartureStatus,
  UpdateDeparture,
} from '../../core/api/types';

export interface DepartureQuery {
  tourRefId?: string;
  status?: DepartureStatus;
  /** ISO instants (UTC). */
  from?: string;
  to?: string;
}

const MAX_PAGES = 10;

/** Departures from now to a year ahead: the window every picker offers (and a bound for the fetch). */
export function upcomingRange(now = new Date()): { from: string; to: string } {
  return {
    from: now.toISOString(),
    to: new Date(now.getTime() + 365 * 86_400_000).toISOString(),
  };
}

@Injectable({ providedIn: 'root' })
export class DeparturesApi {
  private readonly http = inject(ApiClient).http;

  /** Fetches up to `MAX_PAGES` pages of 100; `truncated` tells the UI the range holds more than it got. */
  async listAll(query: DepartureQuery): Promise<{ items: Departure[]; truncated: boolean }> {
    const out: Departure[] = [];
    let total = 0;
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = unwrap(
        await this.http.GET('/departures', {
          params: { query: { ...query, page, pageSize: 100 } },
        }),
      );
      out.push(...res.data);
      total = res.meta.total;
      if (out.length >= total || res.data.length === 0) break;
    }
    return {
      items: out.sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      truncated: out.length < total,
    };
  }

  async get(id: string): Promise<Departure> {
    return unwrap(await this.http.GET('/departures/{id}', { params: { path: { id } } }));
  }

  async create(body: CreateDeparture): Promise<Departure[]> {
    return unwrap(await this.http.POST('/departures', { body })).data;
  }

  async update(id: string, body: UpdateDeparture): Promise<Departure> {
    return unwrap(await this.http.PATCH('/departures/{id}', { params: { path: { id } }, body }));
  }

  async manifest(id: string) {
    return unwrap(await this.http.GET('/departures/{id}/manifest', { params: { path: { id } } }));
  }

  async cancel(
    id: string,
    body: {
      reason: string;
      resolution: 'REFUND' | 'RESCHEDULE' | 'CLIENT_CHOICE';
      targetDepartureId?: string;
    },
  ) {
    return unwrap(
      await this.http.POST('/departures/{id}/cancel', { params: { path: { id } }, body }),
    );
  }
}
