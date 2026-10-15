import { TestBed } from '@angular/core/testing';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { AuthService } from './auth.service';

const user = (permissions: string[]) => ({
  id: 'u1',
  email: 'staff@desertica.pe',
  name: 'Staff',
  active: true,
  role: { id: 'r1', key: 'operator', name: 'Operator', permissions },
});

function session(permissions = ['bookings:read']) {
  return { accessToken: 'at1', expiresIn: 900, user: user(permissions) };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('AuthService', () => {
  let calls: { url: string; auth: string | null; credentials: string; body: string }[];
  let handler: (url: string) => Response;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    calls = [];
    handler = () => json({}, 500);
    vi.stubGlobal('fetch', async (input: Request) => {
      calls.push({
        url: new URL(input.url).pathname,
        auth: input.headers.get('Authorization'),
        credentials: input.credentials,
        body: await input.clone().text(),
      });
      return handler(new URL(input.url).pathname);
    });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RUNTIME_CONFIG,
          useValue: { apiBaseUrl: 'http://api.test/api', googleClientId: 'x' },
        },
      ],
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('logs in, keeps the access token in memory and never stores a refresh token', async () => {
    handler = (url) =>
      url.endsWith('/auth/google')
        ? json(session())
        : json(user(['bookings:read', 'bookings:write']));
    const auth = TestBed.inject(AuthService);
    await auth.loginWithGoogle('google-id-token');

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.accessToken()).toBe('at1');
    expect(sessionStorage.length).toBe(0);
    expect(localStorage.length).toBe(0);
    // /auth/me is the source of truth for permissions
    expect(auth.has('bookings:write')).toBe(true);
    expect(auth.has('users:write')).toBe(false);
    expect(calls.at(-1)).toMatchObject({ url: '/api/auth/me', auth: 'Bearer at1' });
    expect(calls[0].credentials).toBe('include');
  });

  it('restores the session from the refresh cookie on init (no body, credentials included)', async () => {
    handler = (url) =>
      url.endsWith('/auth/refresh') ? json(session()) : json(user(['reports:read']));
    const auth = TestBed.inject(AuthService);
    await auth.init();
    expect(auth.has('reports:read')).toBe(true);
    expect(calls[0]).toMatchObject({ url: '/api/auth/refresh', credentials: 'include', body: '' });
  });

  it('stays signed out when there is no valid cookie, and keeps trying after a 5xx', async () => {
    const auth = TestBed.inject(AuthService);

    handler = () => json({ statusCode: 401, error: 'Unauthorized', message: 'nope' }, 401);
    await auth.init();
    expect(auth.isAuthenticated()).toBe(false);

    handler = () => json({ statusCode: 503, error: 'x', message: 'down' }, 503);
    expect(await auth.refresh()).toBe(false);

    handler = (url) => (url.endsWith('/auth/refresh') ? json(session()) : json(user([])));
    expect(await auth.refresh()).toBe(true);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('shares one refresh request between concurrent callers', async () => {
    handler = (url) => (url.endsWith('/auth/refresh') ? json(session()) : json(user([])));
    const auth = TestBed.inject(AuthService);
    await Promise.all([auth.refresh(), auth.refresh(), auth.refresh()]);
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('logout wipes local state and revokes the cookie session', async () => {
    handler = (url) =>
      url.endsWith('/auth/google')
        ? json(session())
        : url.endsWith('/auth/me')
          ? json(user([]))
          : new Response(null, { status: 204 });
    const auth = TestBed.inject(AuthService);
    await auth.loginWithGoogle('t');
    await auth.logout();
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.accessToken()).toBeNull();
    const logout = calls.find((c) => c.url.endsWith('/auth/logout'));
    expect(logout).toMatchObject({ credentials: 'include', body: '' });
  });
});
