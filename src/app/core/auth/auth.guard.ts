import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Sends anonymous visitors to the login page, remembering where they wanted to go. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Keeps signed-in staff out of the login page. */
export const guestGuard: CanActivateFn = () =>
  inject(AuthService).isAuthenticated() ? inject(Router).createUrlTree(['/']) : true;

/** Route `data: { permission: 'bookings:read' }` (or an array: any of them) hides the route from roles without it. */
export const permissionGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const required = route.data['permission'] as string | string[] | undefined;
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required];
  return list.some((p) => auth.has(p)) || inject(Router).createUrlTree(['/forbidden']);
};
