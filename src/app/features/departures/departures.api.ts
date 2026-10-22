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

@Injectable({ providedIn: 'root' })
export class DeparturesApi {
  private readonly http = inject(ApiClient).http;

  /** Fetches every page (100 per page) so calendars and pickers see the whole range. */
  async listAll(query: DepartureQuery): Promise<Departure[]> {
    const out: Departure[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = unwrap(
        await this.http.GET('/departures', {
          params: { query: { ...query, page, pageSize: 100 } },
        }),
      );
      out.push(...res.data);
      if (out.length >= res.meta.total || res.data.length === 0) break;
    }
    return out.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
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
