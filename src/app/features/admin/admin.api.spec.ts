import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { RUNTIME_CONFIG } from '../../core/config/runtime-config';
import { AdminApi } from './admin.api';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('AdminApi legal documents', () => {
  const seen: { method: string; path: string; search: string; body: unknown }[] = [];
  let reply: (req: Request) => Response;

  beforeEach(() => {
    seen.length = 0;
    vi.stubGlobal('fetch', async (req: Request) => {
      const url = new URL(req.url);
      seen.push({
        method: req.method,
        path: url.pathname,
        search: url.search,
        body: req.method === 'POST' ? await req.json() : null,
      });
      return reply(req);
    });
    TestBed.configureTestingModule({
      providers: [
        {
          provide: RUNTIME_CONFIG,
          useValue: { apiBaseUrl: 'http://api.test/api', googleClientId: '' },
        },
        { provide: AuthService, useValue: { accessToken: () => 't', refresh: async () => false } },
      ],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('reads the version in force with its text, and null when none is published', async () => {
    const api = TestBed.inject(AdminApi);
    reply = () =>
      json(200, {
        id: 'd1',
        kind: 'TERMS',
        locale: 'es',
        version: 2,
        cmsSlug: 'terms',
        title: 'Términos',
        text: 'Hola',
        publishedAt: '2026-11-10T00:00:00Z',
        contentHash: 'h',
      });
    expect((await api.currentLegal('TERMS', 'es'))?.text).toBe('Hola');
    expect(seen[0]).toMatchObject({
      method: 'GET',
      path: '/api/public/legal-documents/TERMS',
      search: '?locale=es',
    });

    reply = () =>
      json(404, { statusCode: 404, error: 'Not Found', message: 'Legal document not found' });
    expect(await api.currentLegal('PRIVACY', 'es')).toBeNull();
  });

  it('publishes the title and text written in the backoffice', async () => {
    reply = () =>
      json(201, {
        id: 'd2',
        kind: 'TERMS',
        locale: 'es',
        version: 3,
        cmsSlug: 'terms',
        title: 'T',
        publishedAt: '2026-11-10T00:00:00Z',
        contentHash: 'h',
      });
    const doc = await TestBed.inject(AdminApi).publishLegal({
      kind: 'TERMS',
      locale: 'es',
      title: 'T',
      text: 'X',
    });
    expect(doc.version).toBe(3);
    expect(seen[0]).toMatchObject({
      method: 'POST',
      path: '/api/legal-documents',
      body: { kind: 'TERMS', locale: 'es', title: 'T', text: 'X' },
    });
  });
});
