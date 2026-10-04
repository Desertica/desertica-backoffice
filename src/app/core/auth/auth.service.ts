import { Injectable, computed, inject, isDevMode, signal } from '@angular/core';
import createClient from 'openapi-fetch';
import { unwrap } from '../api/api-error';
import type { components, paths } from '../api/schema';
import { RUNTIME_CONFIG } from '../config/runtime-config';

export type User = components['schemas']['User'];
type Session = components['schemas']['Session'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  /**
   * Auth endpoints use a client without the refresh middleware to avoid loops.
   * The refresh token is an httpOnly cookie set by the API: the SPA never reads it, it only asks
   * the browser to send it (`credentials: 'include'`; requires same-site with the API, see CLAUDE.md).
   * The access token lives only in memory.
   */
  private readonly raw = createClient<paths>({
    baseUrl: inject(RUNTIME_CONFIG).apiBaseUrl,
    credentials: 'include',
  });

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

  /** Called once at startup: tries to recover the session from the refresh cookie. */
  async init(): Promise<void> {
    await this.refresh();
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
    this.clear();
    try {
      await this.raw.POST('/auth/logout');
    } catch {
      /* the local session is already gone */
    }
  }

  private async doRefresh(): Promise<boolean> {
    try {
      const { data, response } = await this.raw.POST('/auth/refresh');
      if (!data) {
        // Only a rejected cookie ends the session; a 5xx may be transient.
        if (response.status === 401 || response.status === 403) this.clear();
        return false;
      }
      await this.adopt(data);
      return true;
    } catch {
      // Network failure: the cookie is still there, so a later attempt can succeed.
      return false;
    }
  }

  private async adopt(session: Session): Promise<void> {
    this._accessToken.set(session.accessToken);
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
  }
}
