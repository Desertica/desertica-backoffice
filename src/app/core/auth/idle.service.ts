import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { readStorage, writeStorage } from '../storage/safe-storage';

/** Sign out after 30 min without activity, warning 2 min before. */
export const IDLE_LIMIT_MS = 30 * 60_000;
export const IDLE_WARNING_MS = 2 * 60_000;
const STORAGE_KEY = 'desertica.lastActivity';
const EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;

export type IdleState =
  { kind: 'active' } | { kind: 'warning'; secondsLeft: number } | { kind: 'expired' };

/** Pure rule: what to do given the last activity (ms) and now (ms). */
export function idleState(lastActivity: number, now: number): IdleState {
  const left = lastActivity + IDLE_LIMIT_MS - now;
  if (left <= 0) return { kind: 'expired' };
  if (left <= IDLE_WARNING_MS) return { kind: 'warning', secondsLeft: Math.ceil(left / 1000) };
  return { kind: 'active' };
}

/**
 * Inactivity timer for the signed-in shell. Activity in any tab counts (shared through
 * `localStorage`), so working in one tab does not sign out from another.
 */
@Injectable({ providedIn: 'root' })
export class IdleService {
  private readonly doc = inject(DOCUMENT);
  private lastActivity = Date.now();
  private lastWrite = 0;
  readonly state = signal<IdleState>({ kind: 'active' });

  /** Starts watching; `onExpire` runs once when the limit is reached. Stops with `destroyRef`. */
  watch(destroyRef: DestroyRef, onExpire: () => void): void {
    this.touch();
    const onActivity = () => {
      // While the warning shows, only the explicit button keeps the session (a stray scroll does not).
      if (this.state().kind === 'active') this.touch();
    };
    for (const e of EVENTS) this.doc.addEventListener(e, onActivity, { passive: true });
    const timer = setInterval(() => {
      const shared = Number(readStorage('local', STORAGE_KEY)) || 0;
      const state = idleState(Math.max(this.lastActivity, shared), Date.now());
      this.state.set(state);
      if (state.kind === 'expired') {
        clearInterval(timer);
        onExpire();
      }
    }, 1000);
    destroyRef.onDestroy(() => {
      clearInterval(timer);
      for (const e of EVENTS) this.doc.removeEventListener(e, onActivity);
      this.state.set({ kind: 'active' });
    });
  }

  /** Counts as activity (the "stay signed in" button). */
  touch(): void {
    const now = Date.now();
    this.lastActivity = now;
    this.state.set({ kind: 'active' });
    if (now - this.lastWrite > 5000) {
      this.lastWrite = now;
      writeStorage('local', STORAGE_KEY, String(now));
    }
  }
}
