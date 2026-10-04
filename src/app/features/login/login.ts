import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  isDevMode,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { ApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { GoogleIdentity } from '../../core/auth/google-identity';
import { I18n, LANGS } from '../../core/i18n/i18n.service';
import type { MessageKey } from '../../core/i18n/messages.es';
import { TPipe } from '../../core/i18n/t.pipe';
import { RUNTIME_CONFIG } from '../../core/config/runtime-config';
import { ThemeService } from '../../core/theme/theme.service';

/** Maps the failure to a message key. 401/403 are the API's answers for a bad token / foreign domain. */
export function loginErrorKey(e: unknown): MessageKey {
  if (e instanceof ApiError && (e.statusCode === 401 || e.statusCode === 403)) {
    return e.statusCode === 401 ? 'login.error.401' : 'login.error.403';
  }
  return 'login.error.generic';
}

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, HlmButtonImports, HlmCardImports, HlmAlertImports],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly google = inject(GoogleIdentity);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly theme = inject(ThemeService);
  protected readonly i18n = inject(I18n);

  protected readonly button = viewChild<ElementRef<HTMLElement>>('googleButton');
  protected readonly configured = this.google.configured;
  protected readonly langs = LANGS;
  protected readonly devLogin = isDevMode() && !!inject(RUNTIME_CONFIG).devLogin;
  protected readonly busy = signal(false);
  protected readonly error = signal<MessageKey | null>(null);

  constructor() {
    // Re-render the Google button when language or theme change (it localises itself).
    effect(() => {
      const host = this.button()?.nativeElement;
      const locale = this.i18n.lang();
      const dark = this.theme.isDark();
      if (!host || !this.configured) return;
      this.google
        .renderButton(host, (idToken) => void this.signIn(idToken), {
          locale,
          theme: dark ? 'filled_black' : 'outline',
        })
        .catch(() => this.error.set('login.loadError'));
    });
  }

  protected signInWithMock() {
    // Prism accepts any token and answers with the contract's example session.
    void this.signIn('mock-id-token');
  }

  private async signIn(idToken: string) {
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.auth.loginWithGoogle(idToken);
      await this.router.navigateByUrl(this.safeReturnUrl());
    } catch (e) {
      this.error.set(loginErrorKey(e));
    } finally {
      this.busy.set(false);
    }
  }

  /** Only same-app paths: never follow an absolute URL from the query string. */
  private safeReturnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}
