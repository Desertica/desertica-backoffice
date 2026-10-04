import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBuilding2,
  lucideCalendarDays,
  lucideCheck,
  lucideCreditCard,
  lucideLanguages,
  lucideLayoutDashboard,
  lucideLogOut,
  lucideMenu,
  lucideMessageSquareWarning,
  lucideMonitor,
  lucideMoon,
  lucideReceipt,
  lucideScrollText,
  lucideSettings,
  lucideShieldAlert,
  lucideSun,
  lucideTicket,
  lucideUserCog,
  lucideUsers,
  lucideX,
} from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { AuthService } from '../core/auth/auth.service';
import { GoogleIdentity } from '../core/auth/google-identity';
import { I18n, LANGS, type Lang } from '../core/i18n/i18n.service';
import type { MessageKey } from '../core/i18n/messages.es';
import { TPipe } from '../core/i18n/t.pipe';
import { NAV_GROUPS } from '../core/nav/nav-items';
import { ThemeService, type ThemeChoice } from '../core/theme/theme.service';

@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NgIcon,
    TPipe,
    HlmButtonImports,
    HlmDropdownMenuImports,
  ],
  providers: [
    provideIcons({
      lucideBuilding2,
      lucideCalendarDays,
      lucideCheck,
      lucideCreditCard,
      lucideLanguages,
      lucideLayoutDashboard,
      lucideLogOut,
      lucideMenu,
      lucideMessageSquareWarning,
      lucideMonitor,
      lucideMoon,
      lucideReceipt,
      lucideScrollText,
      lucideSettings,
      lucideShieldAlert,
      lucideSun,
      lucideTicket,
      lucideUserCog,
      lucideUsers,
      lucideX,
    }),
  ],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18n);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly google = inject(GoogleIdentity);

  protected readonly langs = LANGS;
  protected readonly themes: readonly { value: ThemeChoice; label: MessageKey }[] = [
    { value: 'light', label: 'theme.light' },
    { value: 'dark', label: 'theme.dark' },
    { value: 'system', label: 'theme.system' },
  ];
  protected readonly menuOpen = signal(false);

  /** Only the entries the signed-in role may open; empty groups disappear. */
  protected readonly groups = computed(() =>
    NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => this.auth.has(i.permission)),
    })).filter((g) => g.items.length > 0),
  );

  protected readonly themeIcon = computed(() =>
    this.theme.choice() === 'system'
      ? 'lucideMonitor'
      : this.theme.choice() === 'dark'
        ? 'lucideMoon'
        : 'lucideSun',
  );

  protected setLang(lang: Lang) {
    this.i18n.set(lang);
  }

  protected setTheme(choice: ThemeChoice) {
    this.theme.set(choice);
  }

  protected async signOut() {
    await this.auth.logout();
    this.google.disableAutoSelect();
    await this.router.navigateByUrl('/login');
  }
}
