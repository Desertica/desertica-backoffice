import { Injectable, signal } from '@angular/core';

/** `details.reason` of the API's 403 that asks for a fresh Google sign-in before a sensitive action. */
export const REAUTH_REQUIRED = 'reauth_required';

/** True when a failed response is the API asking for a recent sign-in. */
export async function isReauthRequired(response: Response): Promise<boolean> {
  if (response.status !== 403) return false;
  try {
    const body = (await response.clone().json()) as { details?: { reason?: unknown } };
    return body.details?.reason === REAUTH_REQUIRED;
  } catch {
    return false;
  }
}

/**
 * Asks the user to sign in with Google again (the shell shows the dialog while `pending`).
 * Concurrent requests share one prompt; resolves `true` once the fresh session is in place.
 */
@Injectable({ providedIn: 'root' })
export class ReauthService {
  readonly pending = signal(false);
  private waiting: Promise<boolean> | null = null;
  private resolve: ((ok: boolean) => void) | null = null;

  request(): Promise<boolean> {
    this.waiting ??= new Promise<boolean>((resolve) => {
      this.resolve = resolve;
      this.pending.set(true);
    });
    return this.waiting;
  }

  /** Called by the dialog: `true` after a successful sign-in, `false` if cancelled or failed. */
  finish(ok: boolean): void {
    this.resolve?.(ok);
    this.resolve = null;
    this.waiting = null;
    this.pending.set(false);
  }
}
