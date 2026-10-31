import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';
import { unwrap } from '../../core/api/api-error';
import type { Complaint, ComplaintStatus, Page } from '../../core/api/types';

const DUE_SOON_MS = 3 * 86_400_000;

export function dueSoon(items: Complaint[], now: number): Complaint[] {
  return items
    .filter((c) => c.status !== 'ANSWERED' && new Date(c.dueAt).getTime() - now < DUE_SOON_MS)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

@Injectable({ providedIn: 'root' })
export class ComplaintsApi {
  private readonly http = inject(ApiClient).http;

  async list(query: {
    page?: number;
    pageSize?: number;
    status?: ComplaintStatus;
  }): Promise<Page<Complaint>> {
    return unwrap(await this.http.GET('/complaints', { params: { query } }));
  }

  /** Unanswered complaints due within the next 3 days or already overdue (the dashboard's definition). */
  async listDueSoon(now = Date.now()): Promise<Page<Complaint>> {
    // shortcut: one page of 100 per status; complaints are few, upgrade if the open backlog can exceed it.
    const pages = await Promise.all(
      (['OPEN', 'IN_PROGRESS'] as const).map((status) => this.list({ pageSize: 100, status })),
    );
    const data = dueSoon(
      pages.flatMap((p) => p.data),
      now,
    );
    return { data, meta: { page: 1, pageSize: Math.max(data.length, 1), total: data.length } };
  }

  /** Complaint ids are integers in the contract (the only non-UUID id). */
  async get(id: number): Promise<Complaint> {
    return unwrap(await this.http.GET('/complaints/{id}', { params: { path: { id } } }));
  }

  async answer(id: number, answer: string): Promise<Complaint> {
    return unwrap(
      await this.http.POST('/complaints/{id}/answer', {
        params: { path: { id } },
        body: { answer },
      }),
    );
  }
}
