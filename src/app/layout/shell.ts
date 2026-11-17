import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  type ElementRef,
} from '@angular/core';
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
  lucideMap,
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
import { IdleService } from '../core/auth/idle.service';
import { ReauthService } from '../core/auth/reauth.service';
import { I18n, LANGS, type Lang } from '../core/i18n/i18n.service';
import type { MessageKey } from '../core/i18n/messages.es';
import { TPipe } from '../core/i18n/t.pipe';
import { NAV_GROUPS } from '../core/nav/nav-items';
import { ThemeService, type ThemeChoice } from '../core/theme/theme.service';
import { useDialogs } from '../shared/dialog';
import { Notify } from '../shared/notify';
import { ReauthDialog } from './reauth-dialog';

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
      lucideMap,
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
  host: { '(document:keydown.escape)': 'closeMenu()' },
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(I18n);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly google = inject(GoogleIdentity);
  private readonly notify = inject(Notify);
  private readonly injector = inject(Injector);
  protected readonly idle = inject(IdleService);
  private readonly reauth = inject(ReauthService);
  private readonly dialogs = useDialogs();
  private readonly sidebar = viewChild.required<ElementRef<HTMLElement>>('sidebar');
  private readonly menuButton = viewChild.required<ElementRef<HTMLElement>>('menuButton');
  private signingOut = false;

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

  protected openMenu() {
    this.menuOpen.set(true);
    afterNextRender(() => this.sidebar().nativeElement.focus(), { injector: this.injector });
  }

  protected closeMenu() {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.menuButton().nativeElement.focus();
  }

  protected setLang(lang: Lang) {
    this.i18n.set(lang);
  }

  protected setTheme(choice: ThemeChoice) {
    this.theme.set(choice);
  }

  constructor() {
    // The session can end on its own (refresh cookie rejected): go to login instead of leaving a dead screen.
    let wasAuthenticated = this.auth.isAuthenticated();
    effect(() => {
      const authenticated = this.auth.isAuthenticated();
      if (wasAuthenticated && !authenticated && !this.signingOut) {
        void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
        this.notify.info('auth.sessionExpired');
      }
      wasAuthenticated = authenticated;
    });

    // 30 min without activity: close the session (the API session also ends after 12 h).
    this.idle.watch(inject(DestroyRef), () => void this.signOut('auth.idle.signedOut'));

    // A sensitive action needs a fresh Google sign-in: ask, then let the API client replay it.
    effect(() => {
      if (!this.reauth.pending()) return;
      void this.dialogs.open<boolean>(ReauthDialog).then((ok) => this.reauth.finish(ok === true));
    });
  }

  protected async signOut(reason?: MessageKey) {
    this.signingOut = true;
    await this.auth.logout();
    this.google.disableAutoSelect();
    if (reason) {
      this.notify.info(reason);
      await this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
    } else {
      await this.router.navigateByUrl('/login');
    }
  }
}
