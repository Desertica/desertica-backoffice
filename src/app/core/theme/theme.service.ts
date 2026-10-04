import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { readStorage, writeStorage } from '../storage/safe-storage';

export type ThemeChoice = 'light' | 'dark' | 'system';
export const THEMES: readonly ThemeChoice[] = ['light', 'dark', 'system'];
const STORAGE_KEY = 'desertica.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);
  private readonly media = this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly choice = signal<ThemeChoice>(this.read());
  readonly isDark = () =>
    this.choice() === 'system' ? this.systemDark() : this.choice() === 'dark';

  constructor() {
    this.media?.addEventListener?.('change', (e) => this.systemDark.set(e.matches));
    effect(() => {
      this.doc.documentElement.classList.toggle('dark', this.isDark());
      writeStorage('local', STORAGE_KEY, this.choice());
    });
  }

  set(choice: ThemeChoice): void {
    this.choice.set(choice);
  }

  private read(): ThemeChoice {
    const stored = readStorage('local', STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }
}
