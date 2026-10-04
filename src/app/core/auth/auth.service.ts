import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';
import createClient from 'openapi-fetch';
import { unwrap } from '../api/api-error';
import type { components, paths } from '../api/schema';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { readStorage, writeStorage } from '../storage/safe-storage';

export type User = components['schemas']['User'];
type Session = components['schemas']['Session'];

/**
 * Refresh token storage (see PR description for the trade-off):
 * the access token lives only in memory; the refresh token lives in `sessionStorage`
 * so a reload keeps the session but closing the tab ends it.
 */
export const REFRESH_TOKEN_KEY = 'desertica.refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Auth endpoints use a client without the refresh middleware to avoid loops.
  private readonly raw = createClient<paths>({ baseUrl: inject(RUNTIME_CONFIG).apiBaseUrl });

  private readonly devMock = isDevMode() && !!inject(RUNTIME_CONFIG).devLogin;
  private readonly _accessToken = signal<string | null>(null);
  private readonly _user = signal<User | null>(null);
  private inflightRefresh: Promise<boolean> | null = null;

  readonly accessToken = this._accessToken.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  private readonly permissions = computed(() => new Set(this._user()?.role.permissions ?? []));

  /** UI-only check. The API is the real authority on every call. */
  has(permission: string): boolean {
    // Prism's example user carries a placeholder permission list; in the dev mock everything is visible.
    if (this.devMock) return true;
    return this.permissions().has(permission);
  }

  /** Called once at startup: restores the session from the stored refresh token. */
  async init(): Promise<void> {
    if (readStorage('session', REFRESH_TOKEN_KEY)) await this.refresh();
  }

  async loginWithGoogle(idToken: string): Promise<void> {
    const session = unwrap<Session>(await this.raw.POST('/auth/google', { body: { idToken } }));
    await this.adopt(session);
  }

  /** Renews the access token. Concurrent callers share one request. */
  refresh(): Promise<boolean> {
    this.inflightRefresh ??= this.doRefresh().finally(() => (this.inflightRefresh = null));
    return this.inflightRefresh;
  }

  async logout(): Promise<void> {
    const refreshToken = readStorage('session', REFRESH_TOKEN_KEY);
    this.clear();
    if (refreshToken) {
      try {
        await this.raw.POST('/auth/logout', { body: { refreshToken } });
      } catch {
        /* the local session is already gone */
      }
    }
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = readStorage('session', REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;
    try {
      const { data, response } = await this.raw.POST('/auth/refresh', { body: { refreshToken } });
      if (!data) {
        // Only a rejected token ends the session; a 5xx may be transient.
        if (response.status === 401 || response.status === 403) this.clear();
        return false;
      }
      await this.adopt(data);
      return true;
    } catch {
      // Network failure: keep the stored token so a later attempt can succeed.
      return false;
    }
  }

  private async adopt(session: Session): Promise<void> {
    this._accessToken.set(session.accessToken);
    writeStorage('session', REFRESH_TOKEN_KEY, session.refreshToken);
    this._user.set(session.user);
    // `GET /auth/me` is the source of truth for permissions.
    const me = await this.raw.GET('/auth/me', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (me.data) this._user.set(me.data);
  }

  private clear(): void {
    this._accessToken.set(null);
    this._user.set(null);
    writeStorage('session', REFRESH_TOKEN_KEY, null);
  }
}
