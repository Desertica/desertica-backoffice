import type { Route, Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/auth/auth.guard';

const placeholder = () => import('./shared/placeholder').then((m) => m.Placeholder);

/** A staff route: hidden (redirect to /forbidden) unless the role holds `permission`. */
const guarded = (
  path: string,
  permission: string,
  loadComponent: Route['loadComponent'],
): Route => ({
  path,
  canActivate: [permissionGuard],
  data: { permission },
  loadComponent,
});

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
      guarded('dashboard', 'reports:read', () =>
        import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      ),

      guarded('departures', 'departures:read', () =>
        import('./features/departures/departures-page').then((m) => m.DeparturesPage),
      ),
      guarded('departures/new', 'departures:write', () =>
        import('./features/departures/departure-form').then((m) => m.DepartureForm),
      ),
      guarded('departures/:id', 'departures:read', () =>
        import('./features/departures/departure-detail').then((m) => m.DepartureDetail),
      ),

      guarded('bookings', 'bookings:read', () =>
        import('./features/bookings/bookings-page').then((m) => m.BookingsPage),
      ),
      guarded('bookings/new', 'bookings:write', () =>
        import('./features/bookings/manual-booking').then((m) => m.ManualBooking),
      ),
      guarded('bookings/:id', 'bookings:read', () =>
        import('./features/bookings/booking-detail').then((m) => m.BookingDetail),
      ),

      guarded('customers', 'customers:read', () =>
        import('./features/customers/customers-page').then((m) => m.CustomersPage),
      ),
      guarded('customers/:id', 'customers:read', () =>
        import('./features/customers/customer-detail').then((m) => m.CustomerDetail),
      ),

      // Milestone 3 screens: placeholders until their features land.
      guarded('complaints', 'complaints:read', placeholder),
      guarded('payments', 'payments:read', placeholder),
      guarded('disputes', 'payments:read', placeholder),
      guarded('documents', 'documents:read', placeholder),
      guarded('users', 'users:read', placeholder),
      guarded('company', 'company:read', placeholder),
      guarded('audit', 'audit:read', placeholder),
      guarded('settings', 'settings:read', placeholder),

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
