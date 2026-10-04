import { Injectable, inject } from '@angular/core';
import createClient, { type Client, type Middleware } from 'openapi-fetch';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { AuthService } from '../auth/auth.service';
import type { paths } from './schema';

const AUTH_PATHS = ['/auth/google', '/auth/refresh', '/auth/logout'];

/**
 * Typed client generated from the contract (`openapi-fetch` + `openapi-typescript`).
 * Adds the bearer token and, on a 401, renews the session once and replays the request.
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly auth = inject(AuthService);
  private readonly baseUrl = inject(RUNTIME_CONFIG).apiBaseUrl;
  private readonly replayable = new Map<string, Request>();

  readonly http: Client<paths> = createClient<paths>({ baseUrl: this.baseUrl });

  constructor() {
    this.http.use(this.authMiddleware());
  }

  private authMiddleware(): Middleware {
    const isAuthCall = (url: string) => AUTH_PATHS.some((p) => new URL(url).pathname.endsWith(p));
    return {
      onRequest: ({ request, id }) => {
        if (isAuthCall(request.url)) return request;
        this.replayable.set(id, request.clone());
        const token = this.auth.accessToken();
        if (token) request.headers.set('Authorization', `Bearer ${token}`);
        return request;
      },
      onResponse: async ({ request, response, id }) => {
        const original = this.replayable.get(id);
        this.replayable.delete(id);
        if (response.status !== 401 || !original || isAuthCall(request.url)) return response;
        const renewed = await this.auth.refresh();
        if (!renewed) return response;
        original.headers.set('Authorization', `Bearer ${this.auth.accessToken()}`);
        return fetch(original);
      },
      onError: ({ id }) => {
        this.replayable.delete(id);
      },
    };
  }
}
