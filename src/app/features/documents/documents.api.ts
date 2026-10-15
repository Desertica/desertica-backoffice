import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';
import { unwrap } from '../../core/api/api-error';
import type { Document, DocumentStatus, DocumentType, Page } from '../../core/api/types';

export interface DocumentQuery {
  page?: number;
  pageSize?: number;
  status?: DocumentStatus;
  docType?: DocumentType;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentsApi {
  private readonly http = inject(ApiClient).http;

  async list(query: DocumentQuery): Promise<Page<Document>> {
    return unwrap(await this.http.GET('/documents', { params: { query } }));
  }

  async retry(id: string): Promise<Document> {
    return unwrap(await this.http.POST('/documents/{id}/retry', { params: { path: { id } } }));
  }

  async void(id: string, reason: string): Promise<Document> {
    return unwrap(
      await this.http.POST('/documents/{id}/void', { params: { path: { id } }, body: { reason } }),
    );
  }

  async creditNote(id: string, body: { reason: string; amountCents: number }): Promise<Document> {
    return unwrap(
      await this.http.POST('/documents/{id}/credit-note', { params: { path: { id } }, body }),
    );
  }

  async file(id: string, kind: 'xml' | 'cdr' | 'pdf'): Promise<Blob> {
    return unwrap(
      await this.http.GET('/documents/{id}/files/{kind}', {
        params: { path: { id, kind } },
        parseAs: 'blob',
      }),
    ) as Blob;
  }
}
