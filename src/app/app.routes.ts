import type { Route, Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/auth/auth.guard';

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

      guarded('complaints', 'complaints:read', () =>
        import('./features/complaints/complaints-page').then((m) => m.ComplaintsPage),
      ),
      guarded('complaints/:id', 'complaints:read', () =>
        import('./features/complaints/complaint-detail').then((m) => m.ComplaintDetail),
      ),
      guarded('payments', 'payments:read', () =>
        import('./features/payments/payments-page').then((m) => m.PaymentsPage),
      ),
      guarded('disputes', 'payments:read', () =>
        import('./features/payments/disputes-page').then((m) => m.DisputesPage),
      ),
      guarded('disputes/:id', 'payments:read', () =>
        import('./features/payments/dispute-detail').then((m) => m.DisputeDetail),
      ),
      guarded('documents', 'documents:read', () =>
        import('./features/documents/documents-page').then((m) => m.DocumentsPage),
      ),
      guarded('users', 'users:read', () =>
        import('./features/admin/users-page').then((m) => m.UsersPage),
      ),
      guarded('company', 'company:read', () =>
        import('./features/admin/company-page').then((m) => m.CompanyPage),
      ),
      guarded('audit', 'audit:read', () =>
        import('./features/admin/audit-page').then((m) => m.AuditPage),
      ),
      guarded('settings', 'settings:read', () =>
        import('./features/admin/settings-page').then((m) => m.SettingsPage),
      ),

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
