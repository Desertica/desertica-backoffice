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
  Page,
  Role,
  Series,
  User,
} from '../../core/api/types';

export type SettingsMap = Record<string, unknown>;

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

  async getSettings(): Promise<SettingsMap> {
    return unwrap(await this.http.GET('/settings')) as SettingsMap;
  }
  async saveSettings(body: SettingsMap): Promise<SettingsMap> {
    return unwrap(await this.http.PUT('/settings', { body })) as SettingsMap;
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
    cmsSlug: string;
  }): Promise<LegalDocument> {
    return unwrap(await this.http.POST('/legal-documents', { body }));
  }
}
