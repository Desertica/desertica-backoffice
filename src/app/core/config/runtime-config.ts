import { InjectionToken } from '@angular/core';

export interface RuntimeConfig {
  /** Base URL of desertica-api, including the `/api` prefix. */
  apiBaseUrl: string;
  /** OAuth client id for Google Identity Services. Empty disables the Google button. */
  googleClientId: string;
  /** Dev builds only: shows a button that logs in against the Prism mock. Never set by the container. */
  devLogin?: boolean;
}

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG');

const DEFAULTS: RuntimeConfig = { apiBaseUrl: '/api', googleClientId: '' };

/** Reads `/config.json`, which the container entrypoint generates from env vars. */
export async function loadRuntimeConfig(fetchFn: typeof fetch = fetch): Promise<RuntimeConfig> {
  try {
    const res = await fetchFn('/config.json', { cache: 'no-store' });
    if (!res.ok) return DEFAULTS;
    return normalizeConfig(await res.json());
  } catch {
    return DEFAULTS;
  }
}

export function normalizeConfig(raw: Partial<RuntimeConfig> | null | undefined): RuntimeConfig {
  return {
    apiBaseUrl: (raw?.apiBaseUrl || DEFAULTS.apiBaseUrl).replace(/\/+$/, ''),
    googleClientId: raw?.googleClientId?.trim() ?? '',
  };
}

/** Dev builds only (`isDevMode()`): `?mock` points the app at `npm run mock` (Prism, port 4010) and enables the dev login. */
export function applyDevOverrides(config: RuntimeConfig, search: string): RuntimeConfig {
  if (!new URLSearchParams(search).has('mock')) return config;
  return { ...config, apiBaseUrl: 'http://localhost:4010', devLogin: true };
}
