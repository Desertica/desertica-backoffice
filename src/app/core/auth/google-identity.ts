import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { RUNTIME_CONFIG } from '../config/runtime-config';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

/**
 * Google Identity Services. The script is the only third-party code in the app: it is loaded
 * on the login page only, never elsewhere, and is required by Google's sign-in flow.
 */
@Injectable({ providedIn: 'root' })
export class GoogleIdentity {
  private readonly doc = inject(DOCUMENT);
  private readonly clientId = inject(RUNTIME_CONFIG).googleClientId;
  private loading: Promise<void> | null = null;

  get configured(): boolean {
    return this.clientId.length > 0;
  }

  async renderButton(
    host: HTMLElement,
    onCredential: (idToken: string) => void,
    options: { locale: string; theme: 'outline' | 'filled_black' },
  ): Promise<void> {
    await this.load();
    google.accounts.id.initialize({
      client_id: this.clientId,
      callback: (r) => onCredential(r.credential),
      use_fedcm_for_prompt: true,
    });
    host.replaceChildren();
    google.accounts.id.renderButton(host, {
      type: 'standard',
      size: 'large',
      shape: 'rectangular',
      text: 'signin_with',
      theme: options.theme,
      locale: options.locale,
    });
  }

  disableAutoSelect(): void {
    if (typeof google !== 'undefined') google.accounts.id.disableAutoSelect();
  }

  private load(): Promise<void> {
    this.loading ??= new Promise<void>((resolve, reject) => {
      const script = this.doc.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        this.loading = null;
        reject(new Error('Google Identity Services failed to load'));
      };
      this.doc.head.appendChild(script);
    });
    return this.loading;
  }
}
