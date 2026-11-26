import type { components } from '../../core/api/schema';
import { Injectable, inject } from '@angular/core';
import { ApiClient } from '../../core/api/api-client';
import { unwrap } from '../../core/api/api-error';
import type {
  AuditLog,
  BlockedIdentity,
  Company,
  CompanyInput,
  DocumentType,
  LegalDocument,
  LegalDocumentKind,
  LegalDocumentWithText,
  Page,
  Role,
  Series,
  User,
} from '../../core/api/types';

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(ApiClient).http;

  async listUsers(): Promise<User[]> {
    return unwrap(await this.http.GET('/users')).data;
  }
  async listRoles(): Promise<Role[]> {
    return unwrap(await this.http.GET('/roles')).data;
  }
  async createUser(body: { email: string; name: string; roleId: string }): Promise<User> {
    return unwrap(await this.http.POST('/users', { body }));
  }
  async updateUser(
    id: string,
    body: { name?: string; roleId?: string; active?: boolean },
  ): Promise<User> {
    return unwrap(await this.http.PATCH('/users/{id}', { params: { path: { id } }, body }));
  }

  async getCompany(): Promise<Company> {
    return unwrap(await this.http.GET('/companies/current'));
  }
  async saveCompany(body: CompanyInput): Promise<Company> {
    return unwrap(await this.http.PUT('/companies/current', { body }));
  }
  async listSeries(): Promise<Series[]> {
    return unwrap(await this.http.GET('/series')).data;
  }
  async createSeries(body: {
    docType: DocumentType;
    prefix: string;
    nextNumber?: number;
  }): Promise<Series> {
    return unwrap(await this.http.POST('/series', { body }));
  }

  async listAudit(query: {
    page?: number;
    pageSize?: number;
    entity?: string;
    entityId?: string;
  }): Promise<Page<AuditLog>> {
    return unwrap(await this.http.GET('/audit-logs', { params: { query } }));
  }

  async getSettings() {
    return unwrap(await this.http.GET('/settings'));
  }
  /** Only the keys sent are changed. */
  async saveSettings(body: components['schemas']['SettingsInput']) {
    return unwrap(await this.http.PUT('/settings', { body }));
  }

  async listBlocked(): Promise<BlockedIdentity[]> {
    return unwrap(await this.http.GET('/blocked-identities')).data;
  }
  async createBlocked(body: {
    kind: 'EMAIL' | 'IP';
    value: string;
    reason?: string;
  }): Promise<BlockedIdentity> {
    return unwrap(await this.http.POST('/blocked-identities', { body }));
  }

  async publishLegal(body: {
    kind: LegalDocumentKind;
    locale: string;
    title: string;
    text: string;
    /** Only with `WAIVER`: the tour the waiver belongs to. */
    tourRefId?: string;
  }): Promise<LegalDocument> {
    return unwrap(await this.http.POST('/legal-documents', { body }));
  }

  /**
   * The published version of a document with its text, or `null` when none is published yet.
   * A `WAIVER` is per tour: pass its `tourRefId`.
   */
  async currentLegal(
    kind: LegalDocumentKind,
    locale: string,
    tourRefId?: string,
  ): Promise<LegalDocumentWithText | null> {
    if (kind === 'WAIVER') {
      if (!tourRefId) return null;
      // The list is sorted newest first; the text only comes with the single document.
      const [latest] = unwrap(
        await this.http.GET('/legal-documents', {
          params: { query: { kind, locale, tourRefId, pageSize: 1 } },
        }),
      ).data;
      if (!latest) return null;
      return unwrap(
        await this.http.GET('/legal-documents/{id}', { params: { path: { id: latest.id } } }),
      );
    }
    const res = await this.http.GET('/public/legal-documents/{kind}', {
      params: { path: { kind }, query: { locale } },
    });
    return res.response.status === 404 ? null : unwrap(res);
  }
}
