import { TestBed } from '@angular/core/testing';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { AuthService } from '../auth/auth.service';
import { ApiClient } from './api-client';

describe('ApiClient', () => {
  it('adds the bearer token, and on 401 refreshes once and replays the request with the new token', async () => {
    let token = 'old';
    const refresh = vi.fn(async () => {
      token = 'new';
      return true;
    });
    const seen: { url: string; auth: string | null }[] = [];
    vi.stubGlobal('fetch', async (req: Request) => {
      seen.push({ url: new URL(req.url).pathname, auth: req.headers.get('Authorization') });
      return req.headers.get('Authorization') === 'Bearer new'
        ? new Response(JSON.stringify({ data: [], meta: { page: 1, pageSize: 25, total: 0 } }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
        : new Response(
            JSON.stringify({ statusCode: 401, error: 'Unauthorized', message: 'expired' }),
            {
              status: 401,
              headers: { 'content-type': 'application/json' },
            },
          );
    });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RUNTIME_CONFIG,
          useValue: { apiBaseUrl: 'http://api.test/api', googleClientId: '' },
        },
        { provide: AuthService, useValue: { accessToken: () => token, refresh } },
      ],
    });

    const { data } = await TestBed.inject(ApiClient).http.GET('/customers', {});

    expect(data).toBeDefined();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(seen.map((s) => s.auth)).toEqual(['Bearer old', 'Bearer new']);
    vi.unstubAllGlobals();
  });
});
