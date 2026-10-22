import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { ApiClient } from '../../core/api/api-client';
import { unwrap } from '../../core/api/api-error';
import type { Currency } from '../../core/api/types';
import { AuthService } from '../../core/auth/auth.service';
import { addDays, limaToday, startOfMonth } from '../../core/format/datetime';
import type { MessageKey } from '../../core/i18n/messages.es';
import { TPipe } from '../../core/i18n/t.pipe';
import { MoneyPipe } from '../../shared/format.pipes';

export type RangePreset = 'today' | '7d' | '30d' | 'month';

/** Inclusive Lima-day range for a preset. */
export function rangeFor(preset: RangePreset, today: string): { from: string; to: string } {
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case '7d':
      return { from: addDays(today, -6), to: today };
    case '30d':
      return { from: addDays(today, -29), to: today };
    case 'month':
      return { from: startOfMonth(today), to: today };
  }
}

export function occupancyPercent(sold?: number, capacity?: number): number {
  return capacity ? Math.round(((sold ?? 0) / capacity) * 100) : 0;
}

/** Each counter opens its list with the filter that reproduces the number. */
export const PENDING_LINKS = [
  {
    key: 'unpaidBookings',
    label: 'dashboard.pending.unpaidBookings',
    link: '/bookings',
    query: { paymentStatus: 'UNPAID' },
    permission: 'bookings:read',
  },
  {
    key: 'documentsInError',
    label: 'dashboard.pending.documentsInError',
    link: '/documents',
    query: { status: 'ERROR' },
    permission: 'documents:read',
  },
  {
    key: 'waiversPending',
    label: 'dashboard.pending.waiversPending',
    link: '/bookings',
    query: { waiver: 'PENDING' },
    permission: 'bookings:read',
  },
  {
    key: 'openDisputes',
    label: 'dashboard.pending.openDisputes',
    link: '/disputes',
    query: { status: 'OPEN' },
    permission: 'payments:read',
  },
  {
    key: 'complaintsDueSoon',
    label: 'dashboard.pending.complaintsDueSoon',
    link: '/complaints',
    query: { due: 'soon' },
    permission: 'complaints:read',
  },
] as const satisfies readonly {
  key: string;
  label: MessageKey;
  link: string;
  query: Record<string, string>;
  permission: string;
}[];

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TPipe, MoneyPipe, HlmButtonImports, HlmCardImports, HlmSkeletonImports],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthService);

  protected readonly presets: readonly { value: RangePreset; label: MessageKey }[] = [
    { value: 'today', label: 'dashboard.range.today' },
    { value: '7d', label: 'dashboard.range.7d' },
    { value: '30d', label: 'dashboard.range.30d' },
    { value: 'month', label: 'dashboard.range.month' },
  ];
  protected readonly preset = signal<RangePreset>('30d');
  protected readonly range = computed(() => rangeFor(this.preset(), limaToday()));

  protected readonly summary = resource({
    params: () => this.range(),
    loader: async ({ params }) =>
      unwrap(await this.api.http.GET('/dashboard/summary', { params: { query: params } })),
  });

  protected readonly sales = computed(() =>
    (this.summary.value()?.sales ?? []).map((s) => ({
      ...s,
      currency: s.currency as Currency,
      netCents: s.grossCents - s.refundedCents,
    })),
  );
  protected readonly occupancy = computed(() => {
    const o = this.summary.value()?.occupancy;
    return {
      sold: o?.seatsSold ?? 0,
      capacity: o?.seatsCapacity ?? 0,
      percent: occupancyPercent(o?.seatsSold, o?.seatsCapacity),
    };
  });
  protected readonly pending = computed(() => {
    const p = this.summary.value()?.pending ?? {};
    return PENDING_LINKS.filter((l) => this.auth.has(l.permission)).map((l) => ({
      ...l,
      count: (p as Record<string, number | undefined>)[l.key] ?? 0,
    }));
  });
}
