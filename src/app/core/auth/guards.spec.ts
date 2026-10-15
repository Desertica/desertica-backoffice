import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  Router,
  type RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { RUNTIME_CONFIG } from '../config/runtime-config';
import { authGuard, guestGuard, permissionGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { HasPermissionDirective } from './has-permission.directive';

const perms = signal<string[] | null>(null);
const fakeAuth = {
  isAuthenticated: () => perms() !== null,
  has: (p: string) => perms()?.includes(p) ?? false,
};

describe('guards', () => {
  beforeEach(() => {
    perms.set(null);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: fakeAuth },
        { provide: RUNTIME_CONFIG, useValue: { apiBaseUrl: '/api', googleClientId: '' } },
      ],
    });
  });

  const run = (guard: typeof authGuard, data: Record<string, unknown> = {}, url = '/bookings') =>
    TestBed.runInInjectionContext(() =>
      guard({ data } as unknown as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  it('redirects anonymous users to /login keeping the return url', () => {
    const result = run(authGuard) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login?returnUrl=%2Fbookings');
    perms.set([]);
    expect(run(authGuard)).toBe(true);
  });

  it('keeps signed-in users out of /login', () => {
    expect(run(guestGuard)).toBe(true);
    perms.set([]);
    expect(run(guestGuard)).toBeInstanceOf(UrlTree);
  });

  it('allows a route when any required permission is held', () => {
    perms.set(['bookings:read']);
    expect(run(permissionGuard, { permission: 'bookings:read' })).toBe(true);
    expect(run(permissionGuard, { permission: ['users:read', 'bookings:read'] })).toBe(true);
    expect(run(permissionGuard, { permission: 'users:read' })).toBeInstanceOf(UrlTree);
  });
});

@Component({
  imports: [HasPermissionDirective],
  template: `<button *appHasPermission="'bookings:cancel'">cancel</button>`,
})
class Host {}

describe('HasPermissionDirective', () => {
  beforeEach(() => {
    perms.set([]);
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: fakeAuth }] });
  });

  it('shows the element only with the permission', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();

    perms.set(['bookings:cancel']);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
  });
});
