import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';
import { unwrap } from '../../core/api/api-error';
import type { Customer, CustomerInput, Page } from '../../core/api/types';

@Injectable({ providedIn: 'root' })
export class CustomersApi {
  private readonly http = inject(ApiClient).http;

  async list(query: { page?: number; pageSize?: number; q?: string }): Promise<Page<Customer>> {
    return unwrap(await this.http.GET('/customers', { params: { query } }));
  }

  async get(id: string): Promise<Customer> {
    return unwrap(await this.http.GET('/customers/{id}', { params: { path: { id } } }));
  }

  async update(id: string, body: CustomerInput): Promise<Customer> {
    return unwrap(await this.http.PATCH('/customers/{id}', { params: { path: { id } }, body }));
  }
}
