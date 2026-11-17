import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { AuthService } from '../core/auth/auth.service';
import { GoogleIdentity } from '../core/auth/google-identity';
import { I18n } from '../core/i18n/i18n.service';
import type { MessageKey } from '../core/i18n/messages.es';
import { TPipe } from '../core/i18n/t.pipe';
import { ThemeService } from '../core/theme/theme.service';
import { injectDialog } from '../shared/dialog';

/** Fresh Google sign-in before a sensitive action. Closes with `true` once the session is renewed. */
@Component({
  selector: 'app-reauth-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TPipe, HlmButtonImports, HlmDialogImports],
  template: `
    <hlm-dialog-header>
      <h2 hlmDialogTitle>{{ 'auth.reauth.title' | t }}</h2>
      <p hlmDialogDescription>{{ 'auth.reauth.body' | t }}</p>
    </hlm-dialog-header>
    @if (configured) {
      <div #googleButton class="flex min-h-11 justify-center" [attr.aria-busy]="busy()"></div>
    } @else {
      <p class="text-sm text-destructive">{{ 'login.notConfigured' | t }}</p>
    }
    @if (error(); as key) {
      <p class="text-sm text-destructive" role="alert">{{ key | t }}</p>
    }
    <hlm-dialog-footer>
      <button hlmBtn type="button" variant="outline" (click)="dialog.close(false)">
        {{ 'common.cancel' | t }}
      </button>
    </hlm-dialog-footer>
  `,
})
export class ReauthDialog {
  protected readonly dialog = injectDialog<unknown, boolean>();
  private readonly auth = inject(AuthService);
  private readonly google = inject(GoogleIdentity);
  private readonly i18n = inject(I18n);
  private readonly theme = inject(ThemeService);
  private readonly button = viewChild<ElementRef<HTMLElement>>('googleButton');
  protected readonly configured = this.google.configured;
  protected readonly busy = signal(false);
  protected readonly error = signal<MessageKey | null>(null);

  constructor() {
    afterNextRender(() => {
      const host = this.button()?.nativeElement;
      if (!host) return;
      this.google
        .renderButton(host, (idToken) => void this.confirm(idToken), {
          locale: this.i18n.lang(),
          theme: this.theme.isDark() ? 'filled_black' : 'outline',
        })
        .catch(() => this.error.set('login.loadError'));
    });
  }

  private async confirm(idToken: string) {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.auth.reauthenticate(idToken);
      if (result === 'other-user') this.error.set('auth.reauth.otherUser');
      this.dialog.close(result === 'ok');
    } catch {
      this.error.set('auth.reauth.failed');
    } finally {
      this.busy.set(false);
    }
  }
}
