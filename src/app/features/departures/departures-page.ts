import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucidePlus } from '@ng-icons/lucide';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { Departure, DepartureStatus } from '../../core/api/types';
import { TourCatalog } from '../../core/api/tour-catalog';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { limaDay, limaToUtcIso, limaToday } from '../../core/format/datetime';
import { I18n } from '../../core/i18n/i18n.service';
import type { MessageKey } from '../../core/i18n/messages.es';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe } from '../../shared/format.pipes';
import { StatusBadge } from '../../shared/status-badge';
import { monthGrid, monthOf, shiftMonth } from './calendar';
import { DeparturesApi } from './departures.api';

const STATUSES: readonly DepartureStatus[] = ['OPEN', 'CLOSED', 'CANCELLED', 'COMPLETED'];

@Component({
  selector: 'app-departures-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    NgIcon,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    StatusBadge,
    HasPermissionDirective,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  providers: [provideIcons({ lucideChevronLeft, lucideChevronRight, lucidePlus })],
  templateUrl: './departures-page.html',
})
export class DeparturesPage {
  private readonly api = inject(DeparturesApi);
  protected readonly catalog = inject(TourCatalog);
  protected readonly i18n = inject(I18n);

  /** A 7-column month grid does not fit a phone: start on the list there. */
  protected readonly view = signal<'calendar' | 'list'>(
    typeof matchMedia === 'function' && matchMedia('(max-width: 639px)').matches
      ? 'list'
      : 'calendar',
  );
  protected readonly month = signal(monthOf(limaToday()));
  protected readonly tourId = signal('');
  protected readonly status = signal<DepartureStatus | ''>('');
  protected readonly statuses = STATUSES;
  protected readonly today = limaToday();
  protected readonly weekdayKeys: readonly MessageKey[] = [
    'weekday.1',
    'weekday.2',
    'weekday.3',
    'weekday.4',
    'weekday.5',
    'weekday.6',
    'weekday.0',
  ];

  constructor() {
    // The catalog only feeds the tour filter; operators without catalog:read just don't get it.
    void this.catalog.load().catch(() => undefined);
  }

  protected readonly departures = resource({
    params: () => ({ month: this.month(), tourId: this.tourId(), status: this.status() }),
    loader: ({ params }) =>
      this.api.listAll({
        from: limaToUtcIso(`${params.month}-01`),
        // exclusive upper bound: 00:00 Lima on the first day after the month
        to: nextDayStart(params.month),
        ...(params.tourId ? { tourRefId: params.tourId } : {}),
        ...(params.status ? { status: params.status } : {}),
      }),
  });

  protected readonly weeks = computed(() => monthGrid(this.month()));
  protected readonly byDay = computed(() => {
    const map = new Map<string, Departure[]>();
    for (const d of this.departures.value() ?? []) {
      const day = limaDay(d.startsAt);
      map.set(day, [...(map.get(day) ?? []), d]);
    }
    return map;
  });
  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.i18n.locale, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${this.month()}-01T00:00:00Z`)),
  );

  protected tourTitle(d: Departure): string {
    return d.tourTitle;
  }

  protected prev() {
    this.month.update((m) => shiftMonth(m, -1));
  }
  protected next() {
    this.month.update((m) => shiftMonth(m, 1));
  }
  protected goToday() {
    this.month.set(monthOf(limaToday()));
  }
  protected dayNumber(day: string): number {
    return Number(day.slice(8));
  }
  protected chipTime(d: Departure): string {
    return new Intl.DateTimeFormat(this.i18n.locale, {
      timeZone: 'America/Lima',
      timeStyle: 'short',
    }).format(new Date(d.startsAt));
  }
}

/** UTC instant of 00:00 Lima on the first day after `month`. */
function nextDayStart(month: string): string {
  return limaToUtcIso(`${shiftMonth(month, 1)}-01`);
}
