import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';
import { unwrap } from '../../core/api/api-error';
import type { Complaint, ComplaintStatus, Page } from '../../core/api/types';

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
