import type { MessageKey } from './messages.es';
import { bookings } from './messages/bookings';
import { customers } from './messages/customers';
import { dashboard } from './messages/dashboard';
import { departures } from './messages/departures';
import { shared } from './messages/shared';

export const en: Record<MessageKey, string> = {
  'app.name': 'Desértica Backoffice',
  'common.loading': 'Loading…',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.close': 'Close',
  'common.search': 'Search',
  'common.error.generic': 'Something went wrong. Please try again.',
  'common.error.network': 'Could not reach the server.',

  'nav.dashboard': 'Dashboard',
  'nav.departures': 'Departures',
  'nav.bookings': 'Bookings',
  'nav.customers': 'Customers',
  'nav.payments': 'Payments and refunds',
  'nav.disputes': 'Disputes',
  'nav.documents': 'Invoices',
  'nav.complaints': 'Complaints',
  'nav.users': 'Users and roles',
  'nav.company': 'Company and series',
  'nav.audit': 'Audit log',
  'nav.settings': 'Settings',
  'nav.group.operations': 'Operations',
  'nav.group.finance': 'Finance',
  'nav.group.admin': 'Administration',
  'nav.open': 'Open menu',

  'header.language': 'Language',
  'header.theme': 'Theme',
  'header.signOut': 'Sign out',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.system': 'System',

  'login.title': 'Sign in to the backoffice',
  'login.subtitle': 'Use your company Google account.',
  'login.notConfigured': 'The Google client id is not configured (GOOGLE_CLIENT_ID).',
  'login.loadError': 'Could not load Google sign-in.',
  'login.error.401': 'We could not verify your Google account.',
  'login.error.403': 'This account has no access. Use your company email.',
  'login.error.generic': 'Could not sign in. Please try again.',
  'login.signingIn': 'Signing in…',

  'forbidden.title': 'No permission',
  'forbidden.body': 'Your role cannot view this screen.',
  'notFound.title': 'Page not found',
  'notFound.body': 'This address does not exist.',
  'notFound.back': 'Back to dashboard',

  'placeholder.soon': 'This screen arrives in the next milestone.',
  ...shared.en,
  ...dashboard.en,
  ...departures.en,
  ...bookings.en,
  ...customers.en,
};
