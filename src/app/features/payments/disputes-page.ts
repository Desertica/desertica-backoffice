import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import type { DisputeStatus } from '../../core/api/types';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe, MoneyPipe } from '../../shared/format.pipes';
import { Pager } from '../../shared/pager';
import { PaymentsApi } from './payments.api';

export const DISPUTE_STATUSES: readonly DisputeStatus[] = ['OPEN', 'WON', 'LOST', 'CLOSED'];

/** 'overdue' once the evidence deadline has passed, 'soon' within 3 days, for open disputes only. */
export function evidenceUrgency(
  status: DisputeStatus,
  dueAt: string | null | undefined,
  now = Date.now(),
): 'overdue' | 'soon' | null {
  if (status !== 'OPEN' || !dueAt) return null;
  const left = new Date(dueAt).getTime() - now;
  return left < 0 ? 'overdue' : left < 3 * 86_400_000 ? 'soon' : null;
}

@Component({
  selector: 'app-disputes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    MoneyPipe,
    Pager,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold">{{ 'disputes.title' | t }}</h1>
      <label class="grid w-48 gap-1 text-sm">
        <span class="text-muted-foreground">{{ 'disputes.filter.status' | t }}</span>
        <select hlmInput [ngModel]="status() ?? ''" (ngModelChange)="setStatus($event)">
          <option value="">{{ 'common.all' | t }}</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ s | enumLabel: 'dispute.status' }}</option>
          }
        </select>
      </label>

      @if (disputes.error()) {
        <div
          class="flex items-center gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
          role="alert"
        >
          {{ 'disputes.loadError' | t }}
          <button hlmBtn size="sm" variant="outline" (click)="disputes.reload()">
            {{ 'common.retry' | t }}
          </button>
        </div>
      } @else if (disputes.isLoading() && !disputes.hasValue()) {
        <hlm-skeleton class="h-64" />
      } @else if (disputes.value(); as res) {
        @if (res.data.length === 0) {
          <p class="text-muted-foreground">{{ 'common.empty' | t }}</p>
        } @else {
          <div hlmTableContainer>
            <table hlmTable>
              <thead hlmTHead>
                <tr hlmTr>
                  <th hlmTh>{{ 'disputes.col.created' | t }}</th>
                  <th hlmTh>{{ 'disputes.col.provider' | t }}</th>
                  <th hlmTh>{{ 'disputes.col.reason' | t }}</th>
                  <th hlmTh>{{ 'disputes.col.due' | t }}</th>
                  <th hlmTh>{{ 'disputes.col.status' | t }}</th>
                  <th hlmTh class="text-right">{{ 'disputes.col.amount' | t }}</th>
                </tr>
              </thead>
              <tbody hlmTBody>
                @for (d of res.data; track d.id) {
                  <tr hlmTr>
                    <td hlmTd>
                      <a [routerLink]="['/disputes', d.id]" class="font-medium hover:underline">{{
                        d.createdAt | limaDateTime
                      }}</a>
                    </td>
                    <td hlmTd>{{ d.provider | enumLabel: 'enum.provider' }}</td>
                    <td hlmTd>{{ d.reason || '—' }}</td>
                    <td
                      hlmTd
                      [class.text-destructive]="urgency(d.status, d.evidenceDueAt) !== null"
                    >
                      {{ d.evidenceDueAt | limaDateTime }}
                    </td>
                    <td hlmTd>{{ d.status | enumLabel: 'dispute.status' }}</td>
                    <td hlmTd class="text-right">{{ d.amountCents | money: d.currency }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <app-pager
            [page]="res.meta.page"
            [pageSize]="res.meta.pageSize"
            [total]="res.meta.total"
            (pageChange)="goTo($event)"
          />
        }
      }
    </div>
  `,
})
export class DisputesPage {
  readonly status = input<string>();
  readonly page = input<string>();
  private readonly api = inject(PaymentsApi);
  private readonly router = inject(Router);
  protected readonly statuses = DISPUTE_STATUSES;
  protected readonly urgency = evidenceUrgency;

  protected readonly query = computed(() => ({
    page: Number(this.page()) > 0 ? Number(this.page()) : 1,
    pageSize: 25,
    ...((DISPUTE_STATUSES as readonly string[]).includes(this.status() ?? '')
      ? { status: this.status() as DisputeStatus }
      : {}),
  }));
  protected readonly disputes = resource({
    params: () => this.query(),
    loader: ({ params }) => this.api.listDisputes(params),
  });

  protected setStatus(value: string) {
    void this.router.navigate([], {
      queryParams: { status: value || null, page: null },
      queryParamsHandling: 'merge',
    });
  }
  protected goTo(page: number) {
    void this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }
}
