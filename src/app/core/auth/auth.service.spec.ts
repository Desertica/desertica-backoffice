import { TestBed } from '@angular/core/testing';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { AuthService, REFRESH_TOKEN_KEY } from './auth.service';

const user = (permissions: string[]) => ({
  id: 'u1',
  email: 'staff@desertica.pe',
  name: 'Staff',
  active: true,
  role: { id: 'r1', key: 'operator', name: 'Operator', permissions },
});

function session(refreshToken = 'rt1', permissions = ['bookings:read']) {
  return { accessToken: 'at1', refreshToken, expiresIn: 900, user: user(permissions) };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('AuthService', () => {
  let calls: { url: string; auth: string | null }[];
  let handler: (url: string) => Response;

  beforeEach(() => {
    sessionStorage.clear();
    calls = [];
    handler = () => json({}, 500);
    vi.stubGlobal('fetch', async (input: Request) => {
      calls.push({ url: new URL(input.url).pathname, auth: input.headers.get('Authorization') });
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

  it('logs in, keeps the access token in memory and the refresh token in sessionStorage', async () => {
    handler = (url) =>
      url.endsWith('/auth/google')
        ? json(session())
        : json(user(['bookings:read', 'bookings:write']));
    const auth = TestBed.inject(AuthService);
    await auth.loginWithGoogle('google-id-token');

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.accessToken()).toBe('at1');
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('rt1');
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    // /auth/me is the source of truth for permissions
    expect(auth.has('bookings:write')).toBe(true);
    expect(auth.has('users:write')).toBe(false);
    expect(calls.at(-1)).toEqual({ url: '/api/auth/me', auth: 'Bearer at1' });
  });

  it('restores the session from the stored refresh token on init', async () => {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, 'old');
    handler = (url) =>
      url.endsWith('/auth/refresh') ? json(session('rotated')) : json(user(['reports:read']));
    const auth = TestBed.inject(AuthService);
    await auth.init();
    expect(auth.has('reports:read')).toBe(true);
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('rotated');
  });

  it('clears the session when the refresh token is rejected, but not on a 5xx', async () => {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, 'bad');
    const auth = TestBed.inject(AuthService);

    handler = () => json({ statusCode: 503, error: 'x', message: 'down' }, 503);
    expect(await auth.refresh()).toBe(false);
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBe('bad');

    handler = () => json({ statusCode: 401, error: 'Unauthorized', message: 'nope' }, 401);
    expect(await auth.refresh()).toBe(false);
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it('shares one refresh request between concurrent callers', async () => {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, 'rt');
    handler = (url) => (url.endsWith('/auth/refresh') ? json(session()) : json(user([])));
    const auth = TestBed.inject(AuthService);
    await Promise.all([auth.refresh(), auth.refresh(), auth.refresh()]);
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('logout wipes local state and revokes the refresh token', async () => {
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
    expect(sessionStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(calls.some((c) => c.url.endsWith('/auth/logout'))).toBe(true);
  });
});
