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
import type { ComplaintStatus } from '../../core/api/types';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe } from '../../shared/format.pipes';
import { Pager } from '../../shared/pager';
import { ComplaintsApi } from './complaints.api';

export const COMPLAINT_STATUSES: readonly ComplaintStatus[] = ['OPEN', 'IN_PROGRESS', 'ANSWERED'];

/** The Libro de Reclamaciones has a legal reply deadline: flag what is overdue or due within 5 days. */
export function dueState(
  status: ComplaintStatus,
  dueAt: string,
  now = Date.now(),
): 'overdue' | 'soon' | null {
  if (status === 'ANSWERED') return null;
  const left = new Date(dueAt).getTime() - now;
  return left < 0 ? 'overdue' : left < 5 * 86_400_000 ? 'soon' : null;
}

@Component({
  selector: 'app-complaints-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    Pager,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold">{{ 'complaints.title' | t }}</h1>
      <label class="grid w-48 gap-1 text-sm">
        <span class="text-muted-foreground">{{ 'complaints.filter.status' | t }}</span>
        <select hlmInput [ngModel]="status() ?? ''" (ngModelChange)="setStatus($event)">
          <option value="">{{ 'common.all' | t }}</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ s | enumLabel: 'complaints.status' }}</option>
          }
        </select>
      </label>

      @if (complaints.error()) {
        <div
          class="flex items-center gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
          role="alert"
        >
          {{ 'complaints.loadError' | t }}
          <button hlmBtn size="sm" variant="outline" (click)="complaints.reload()">
            {{ 'common.retry' | t }}
          </button>
        </div>
      } @else if (complaints.isLoading() && !complaints.hasValue()) {
        <hlm-skeleton class="h-64" />
      } @else if (complaints.value(); as res) {
        @if (res.data.length === 0) {
          <p class="text-muted-foreground">{{ 'common.empty' | t }}</p>
        } @else {
          <div hlmTableContainer>
            <table hlmTable>
              <thead hlmTHead>
                <tr hlmTr>
                  <th hlmTh>{{ 'complaints.col.id' | t }}</th>
                  <th hlmTh>{{ 'complaints.col.kind' | t }}</th>
                  <th hlmTh>{{ 'complaints.col.consumer' | t }}</th>
                  <th hlmTh>{{ 'complaints.col.created' | t }}</th>
                  <th hlmTh>{{ 'complaints.col.due' | t }}</th>
                  <th hlmTh>{{ 'complaints.col.status' | t }}</th>
                </tr>
              </thead>
              <tbody hlmTBody>
                @for (c of res.data; track c.id) {
                  <tr hlmTr>
                    <td hlmTd>
                      <a [routerLink]="['/complaints', c.id]" class="font-medium hover:underline"
                        >#{{ c.id }}</a
                      >
                    </td>
                    <td hlmTd>{{ c.kind | enumLabel: 'complaints.kind' }}</td>
                    <td hlmTd>{{ c.consumerName }}</td>
                    <td hlmTd>{{ c.createdAt | limaDateTime: 'date' }}</td>
                    <td hlmTd>
                      {{ c.dueAt | limaDateTime: 'date' }}
                      @if (due(c.status, c.dueAt); as d) {
                        <span class="ml-1 text-xs font-medium text-destructive">{{
                          d === 'overdue'
                            ? ('complaints.due.overdue' | t)
                            : ('complaints.due.soon' | t)
                        }}</span>
                      }
                    </td>
                    <td hlmTd>{{ c.status | enumLabel: 'complaints.status' }}</td>
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
export class ComplaintsPage {
  readonly status = input<string>();
  readonly page = input<string>();
  private readonly api = inject(ComplaintsApi);
  private readonly router = inject(Router);
  protected readonly statuses = COMPLAINT_STATUSES;
  protected readonly due = dueState;

  protected readonly query = computed(() => ({
    page: Number(this.page()) > 0 ? Number(this.page()) : 1,
    pageSize: 25,
    ...((COMPLAINT_STATUSES as readonly string[]).includes(this.status() ?? '')
      ? { status: this.status() as ComplaintStatus }
      : {}),
  }));
  protected readonly complaints = resource({
    params: () => this.query(),
    loader: ({ params }) => this.api.list(params),
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
