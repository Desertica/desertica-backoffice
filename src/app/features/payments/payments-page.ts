import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import type { PaymentProvider, PaymentStatus } from '../../core/api/types';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { addDays, limaToUtcIso } from '../../core/format/datetime';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { useDialogs } from '../../shared/dialog';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Pager } from '../../shared/pager';
import { StatusBadge } from '../../shared/status-badge';
import { PaymentsApi, type PaymentQuery } from './payments.api';
import { RefundDialog, refundableCents } from './refund-dialog';

const PAGE_SIZE = 25;
const STATUSES: readonly PaymentStatus[] = [
  'PENDING',
  'REQUIRES_ACTION',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'DISPUTED',
];
const PROVIDERS: readonly PaymentProvider[] = ['STRIPE', 'CULQI', 'MANUAL'];

export function toPaymentQuery(f: {
  status?: string;
  provider?: string;
  from?: string;
  to?: string;
  page?: string;
}): PaymentQuery {
  const q: PaymentQuery = { page: Number(f.page) > 0 ? Number(f.page) : 1, pageSize: PAGE_SIZE };
  if (f.status && (STATUSES as readonly string[]).includes(f.status))
    q.status = f.status as PaymentStatus;
  if (f.provider && (PROVIDERS as readonly string[]).includes(f.provider))
    q.provider = f.provider as PaymentProvider;
  if (f.from) q.from = limaToUtcIso(f.from);
  if (f.to) q.to = limaToUtcIso(addDays(f.to, 1));
  return q;
}

@Component({
  selector: 'app-payments-page',
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
  templateUrl: './payments-page.html',
})
export class PaymentsPage {
  readonly status = input<string>();
  readonly provider = input<string>();
  readonly from = input<string>();
  readonly to = input<string>();
  readonly page = input<string>();

  private readonly api = inject(PaymentsApi);
  private readonly router = inject(Router);
  private readonly dialogs = useDialogs();

  protected readonly tab = signal<'payments' | 'refunds'>('payments');
  protected readonly statuses = STATUSES;
  protected readonly providers = PROVIDERS;
  protected readonly refundable = refundableCents;

  protected readonly query = computed(() =>
    toPaymentQuery({
      status: this.status(),
      provider: this.provider(),
      from: this.from(),
      to: this.to(),
      page: this.page(),
    }),
  );
  protected readonly payments = resource({
    params: () => (this.tab() === 'payments' ? this.query() : undefined),
    loader: ({ params }) => this.api.listPayments(params),
  });
  protected readonly refunds = resource({
    params: () => (this.tab() === 'refunds' ? { page: this.query().page } : undefined),
    loader: ({ params }) => this.api.listRefunds({ page: params.page, pageSize: PAGE_SIZE }),
  });

  protected setFilter(key: 'status' | 'provider' | 'from' | 'to', value: string) {
    void this.navigate({ [key]: value || null, page: null });
  }
  protected goTo(page: number) {
    void this.navigate({ page: page > 1 ? page : null });
  }
  protected setTab(tab: 'payments' | 'refunds') {
    this.tab.set(tab);
    void this.navigate({ page: null });
  }

  protected async refund(payment: Parameters<typeof refundableCents>[0] & { id: string }) {
    if (await this.dialogs.open(RefundDialog, { payment })) {
      this.payments.reload();
    }
  }

  private navigate(queryParams: Record<string, string | number | null>) {
    return this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
  }
}
