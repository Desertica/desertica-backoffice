import { applyDevOverrides, loadRuntimeConfig, normalizeConfig } from './runtime-config';

describe('runtime config', () => {
  it('trims trailing slashes and defaults the api url', () => {
    expect(normalizeConfig({ apiBaseUrl: 'https://x.test/api//', googleClientId: ' id ' })).toEqual(
      {
        apiBaseUrl: 'https://x.test/api',
        googleClientId: 'id',
      },
    );
    expect(normalizeConfig({})).toEqual({ apiBaseUrl: '/api', googleClientId: '' });
  });

  it('falls back to defaults when /config.json is unavailable', async () => {
    const failing = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    expect(await loadRuntimeConfig(failing)).toEqual({ apiBaseUrl: '/api', googleClientId: '' });
  });
});

describe('dev overrides', () => {
  const base = { apiBaseUrl: '/api', googleClientId: '' };
  it('points to Prism only when ?mock is present', () => {
    expect(applyDevOverrides(base, '')).toBe(base);
    expect(applyDevOverrides(base, '?mock')).toEqual({
      apiBaseUrl: 'http://localhost:4010',
      googleClientId: '',
      devLogin: true,
    });
  });
});
