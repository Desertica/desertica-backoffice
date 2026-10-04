import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { TourCatalog } from '../../core/api/tour-catalog';
import type { BookingStatus } from '../../core/api/types';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { addDays, limaToUtcIso } from '../../core/format/datetime';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Pager } from '../../shared/pager';
import { StatusBadge } from '../../shared/status-badge';
import { type BookingQuery, BookingsApi } from './bookings.api';

export const BOOKING_STATUSES: readonly BookingStatus[] = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];
const PAGE_SIZE = 25;

/** Query-string filters (Lima days) to the API query (UTC instants; `to` is exclusive of the next day). */
export function toBookingQuery(f: {
  status?: string;
  q?: string;
  tour?: string;
  from?: string;
  to?: string;
  page?: string | number;
}): BookingQuery {
  const q: BookingQuery = { page: Number(f.page) > 0 ? Number(f.page) : 1, pageSize: PAGE_SIZE };
  if (f.status && (BOOKING_STATUSES as readonly string[]).includes(f.status))
    q.status = f.status as BookingStatus;
  if (f.q?.trim()) q.q = f.q.trim();
  if (f.tour) q.tourRefId = f.tour;
  if (f.from) q.from = limaToUtcIso(f.from);
  if (f.to) q.to = limaToUtcIso(addDays(f.to, 1));
  return q;
}

@Component({
  selector: 'app-bookings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    MoneyPipe,
    StatusBadge,
    Pager,
    HasPermissionDirective,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  templateUrl: './bookings-page.html',
})
export class BookingsPage {
  // Filters live in the URL (bound by withComponentInputBinding) so views can be shared and survive reloads.
  readonly status = input<string>();
  readonly q = input<string>();
  readonly tour = input<string>();
  readonly from = input<string>();
  readonly to = input<string>();
  readonly page = input<string>();

  private readonly api = inject(BookingsApi);
  private readonly router = inject(Router);
  protected readonly catalog = inject(TourCatalog);
  protected readonly statuses = BOOKING_STATUSES;
  protected readonly search = signal('');
  private debounce: ReturnType<typeof setTimeout> | undefined;

  protected readonly query = computed(() =>
    toBookingQuery({
      status: this.status(),
      q: this.q(),
      tour: this.tour(),
      from: this.from(),
      to: this.to(),
      page: this.page(),
    }),
  );
  protected readonly bookings = resource({
    params: () => this.query(),
    loader: ({ params }) => this.api.list(params),
  });
  protected readonly hasFilters = computed(
    () => !!(this.status() || this.q() || this.tour() || this.from() || this.to()),
  );

  constructor() {
    void this.catalog.load().catch(() => undefined);
    effect(() => this.search.set(this.q() ?? ''));
  }

  protected setFilter(key: 'status' | 'tour' | 'from' | 'to', value: string) {
    void this.navigate({ [key]: value || null, page: null });
  }

  /** Typing waits 300 ms so each keystroke does not hit the API. */
  protected onSearch(value: string) {
    this.search.set(value);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(
      () => void this.navigate({ q: value.trim() || null, page: null }),
      300,
    );
  }

  protected goTo(page: number) {
    void this.navigate({ page: page > 1 ? page : null });
  }

  protected clear() {
    void this.router.navigate([], { queryParams: {} });
  }

  private navigate(queryParams: Record<string, string | number | null>) {
    return this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }
}
