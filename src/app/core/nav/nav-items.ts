import type { MessageKey } from '../i18n/messages.es';

export interface NavItem {
  path: string;
  label: MessageKey;
  icon: string;
  /** Permission (from `GET /auth/me`) needed to see the entry. */
  permission: string;
}

export interface NavGroup {
  label: MessageKey;
  items: readonly NavItem[];
}

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'nav.group.operations',
    items: [
      {
        path: '/dashboard',
        label: 'nav.dashboard',
        icon: 'lucideLayoutDashboard',
        permission: 'reports:read',
      },
      {
        path: '/departures',
        label: 'nav.departures',
        icon: 'lucideCalendarDays',
        permission: 'departures:read',
      },
      {
        path: '/bookings',
        label: 'nav.bookings',
        icon: 'lucideTicket',
        permission: 'bookings:read',
      },
      {
        path: '/customers',
        label: 'nav.customers',
        icon: 'lucideUsers',
        permission: 'customers:read',
      },
      {
        path: '/complaints',
        label: 'nav.complaints',
        icon: 'lucideMessageSquareWarning',
        permission: 'complaints:read',
      },
    ],
  },
  {
    label: 'nav.group.finance',
    items: [
      {
        path: '/payments',
        label: 'nav.payments',
        icon: 'lucideCreditCard',
        permission: 'payments:read',
      },
      {
        path: '/disputes',
        label: 'nav.disputes',
        icon: 'lucideShieldAlert',
        permission: 'payments:read',
      },
      {
        path: '/documents',
        label: 'nav.documents',
        icon: 'lucideReceipt',
        permission: 'documents:read',
      },
    ],
  },
  {
    label: 'nav.group.admin',
    items: [
      { path: '/users', label: 'nav.users', icon: 'lucideUserCog', permission: 'users:read' },
      {
        path: '/company',
        label: 'nav.company',
        icon: 'lucideBuilding2',
        permission: 'company:read',
      },
      { path: '/audit', label: 'nav.audit', icon: 'lucideScrollText', permission: 'audit:read' },
      {
        path: '/settings',
        label: 'nav.settings',
        icon: 'lucideSettings',
        permission: 'settings:read',
      },
    ],
  },
];
