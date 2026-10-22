import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { GoogleIdentity } from '../core/auth/google-identity';
import { Notify } from '../shared/notify';
import { Shell } from './shell';

describe('Shell session expiry', () => {
  const authenticated = signal(true);
  const info = vi.fn();

  beforeEach(() => {
    authenticated.set(true);
    info.mockClear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authenticated,
            has: () => true,
            user: () => null,
            logout: async () => authenticated.set(false),
          },
        },
        { provide: GoogleIdentity, useValue: { disableAutoSelect: vi.fn() } },
        { provide: Notify, useValue: { info } },
        provideRouter([
          { path: 'bookings', children: [] },
          { path: 'login', children: [] },
        ]),
      ],
    });
  });

  it('goes to /login with returnUrl and warns when the session ends by itself', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/bookings?x=1');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    TestBed.createComponent(Shell).detectChanges();
    authenticated.set(false);
    TestBed.tick();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/bookings?x=1' },
    });
    expect(info).toHaveBeenCalledWith('auth.sessionExpired');
  });

  it('does not warn on a manual sign out', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    const shell = TestBed.createComponent(Shell);
    shell.detectChanges();
    await (shell.componentInstance as unknown as { signOut(): Promise<void> }).signOut();
    TestBed.tick();
    expect(navigate).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });

  it('hides the closed drawer from keyboard and screen readers, and Escape closes it returning focus', () => {
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const aside = el.querySelector('#sidebar')!;
    const toggle = el.querySelector<HTMLElement>('[aria-controls="sidebar"]')!;
    expect(aside.classList).toContain('invisible');
    toggle.click();
    fixture.detectChanges();
    expect(aside.classList).not.toContain('invisible');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(aside.classList).toContain('invisible');
    expect(document.activeElement).toBe(toggle);
  });
});
