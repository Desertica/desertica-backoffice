import type { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/auth/auth.guard';

const placeholder = () => import('./shared/placeholder').then((m) => m.Placeholder);

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        canActivate: [permissionGuard],
        data: { permission: 'reports:read' },
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'departures',
        canActivate: [permissionGuard],
        data: { permission: 'departures:read' },
        loadComponent: placeholder,
      },
      {
        path: 'bookings',
        canActivate: [permissionGuard],
        data: { permission: 'bookings:read' },
        loadComponent: placeholder,
      },
      {
        path: 'customers',
        canActivate: [permissionGuard],
        data: { permission: 'customers:read' },
        loadComponent: placeholder,
      },
      {
        path: 'complaints',
        canActivate: [permissionGuard],
        data: { permission: 'complaints:read' },
        loadComponent: placeholder,
      },
      {
        path: 'payments',
        canActivate: [permissionGuard],
        data: { permission: 'payments:read' },
        loadComponent: placeholder,
      },
      {
        path: 'disputes',
        canActivate: [permissionGuard],
        data: { permission: 'payments:read' },
        loadComponent: placeholder,
      },
      {
        path: 'documents',
        canActivate: [permissionGuard],
        data: { permission: 'documents:read' },
        loadComponent: placeholder,
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { permission: 'users:read' },
        loadComponent: placeholder,
      },
      {
        path: 'company',
        canActivate: [permissionGuard],
        data: { permission: 'company:read' },
        loadComponent: placeholder,
      },
      {
        path: 'audit',
        canActivate: [permissionGuard],
        data: { permission: 'audit:read' },
        loadComponent: placeholder,
      },
      {
        path: 'settings',
        canActivate: [permissionGuard],
        data: { permission: 'settings:read' },
        loadComponent: placeholder,
      },
      {
        path: 'forbidden',
        loadComponent: () => import('./features/not-found/forbidden').then((m) => m.Forbidden),
      },
      {
        path: '**',
        loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
      },
    ],
  },
];
