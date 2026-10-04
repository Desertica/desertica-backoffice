import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { readStorage, writeStorage } from '../storage/safe-storage';
import { en } from './messages.en';
import { type MessageKey, es } from './messages.es';

export type Lang = 'es' | 'en';
export const LANGS: readonly Lang[] = ['es', 'en'];
const STORAGE_KEY = 'desertica.lang';
const DICTIONARIES: Record<Lang, Record<MessageKey, string>> = { es, en };

export function detectLang(stored: string | null, browser: string | undefined): Lang {
  if (stored === 'es' || stored === 'en') return stored;
  return browser?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly doc = inject(DOCUMENT);
  readonly lang = signal<Lang>(detectLang(readStorage('local', STORAGE_KEY), navigator.language));

  constructor() {
    effect(() => {
      const lang = this.lang();
      this.doc.documentElement.lang = lang;
      writeStorage('local', STORAGE_KEY, lang);
    });
  }

  /** BCP 47 locale for `Intl` formatting. Peru for Spanish keeps `S/` and day-month-year order. */
  get locale(): string {
    return this.lang() === 'es' ? 'es-PE' : 'en-US';
  }

  t(key: MessageKey, params?: Record<string, string | number>): string {
    let text = DICTIONARIES[this.lang()][key] ?? key;
    if (params)
      for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  }

  set(lang: Lang): void {
    this.lang.set(lang);
  }
}
