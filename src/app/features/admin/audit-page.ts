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
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe } from '../../shared/format.pipes';
import { Pager } from '../../shared/pager';
import { AdminApi } from './admin.api';

@Component({
  selector: 'app-audit-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    TPipe,
    LimaDateTimePipe,
    Pager,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold">{{ 'audit.title' | t }}</h1>
      <div class="flex flex-wrap items-end gap-3">
        <label class="grid gap-1 text-sm">
          <span class="text-muted-foreground">{{ 'audit.filter.entity' | t }}</span>
          <input
            hlmInput
            class="w-44"
            [ngModel]="entityText()"
            (ngModelChange)="onType('entity', $event)"
            placeholder="Booking"
          />
        </label>
        <label class="grid gap-1 text-sm">
          <span class="text-muted-foreground">{{ 'audit.filter.entityId' | t }}</span>
          <input
            hlmInput
            class="w-80"
            [ngModel]="idText()"
            (ngModelChange)="onType('entityId', $event)"
          />
        </label>
      </div>

      @if (logs.error()) {
        <div
          class="flex items-center gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
          role="alert"
        >
          {{ 'audit.loadError' | t }}
          <button hlmBtn size="sm" variant="outline" (click)="logs.reload()">
            {{ 'common.retry' | t }}
          </button>
        </div>
      } @else if (logs.isLoading() && !logs.hasValue()) {
        <hlm-skeleton class="h-64" />
      } @else if (logs.value(); as res) {
        @if (res.data.length === 0) {
          <p class="text-muted-foreground">{{ 'common.empty' | t }}</p>
        } @else {
          <div hlmTableContainer>
            <table hlmTable>
              <thead hlmTHead>
                <tr hlmTr>
                  <th hlmTh>{{ 'audit.col.date' | t }}</th>
                  <th hlmTh>{{ 'audit.col.actor' | t }}</th>
                  <th hlmTh>{{ 'audit.col.action' | t }}</th>
                  <th hlmTh>{{ 'audit.col.entity' | t }}</th>
                  <th hlmTh>{{ 'audit.col.changes' | t }}</th>
                </tr>
              </thead>
              <tbody hlmTBody>
                @for (l of res.data; track l.id) {
                  <tr hlmTr>
                    <td hlmTd class="whitespace-nowrap">{{ l.createdAt | limaDateTime }}</td>
                    <td hlmTd>{{ l.actor || ('audit.system' | t) }}</td>
                    <td hlmTd class="font-medium">{{ l.action }}</td>
                    <td hlmTd>
                      <span class="block">{{ l.entity }}</span
                      ><span
                        class="block max-w-48 truncate text-xs text-muted-foreground"
                        [title]="l.entityId"
                        >{{ l.entityId }}</span
                      >
                    </td>
                    <td hlmTd>
                      @if (l.before || l.after) {
                        <details class="text-xs">
                          <summary class="cursor-pointer text-muted-foreground">
                            {{ 'common.moreInfo' | t }}
                          </summary>
                          @if (l.before) {
                            <p class="mt-1 font-medium">{{ 'audit.before' | t }}</p>
                            <pre class="max-w-md overflow-x-auto rounded bg-muted p-2">{{
                              pretty(l.before)
                            }}</pre>
                          }
                          @if (l.after) {
                            <p class="mt-1 font-medium">{{ 'audit.after' | t }}</p>
                            <pre class="max-w-md overflow-x-auto rounded bg-muted p-2">{{
                              pretty(l.after)
                            }}</pre>
                          }
                        </details>
                      }
                    </td>
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
export class AuditPage {
  readonly entity = input<string>();
  readonly entityId = input<string>();
  readonly page = input<string>();
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);
  protected readonly entityText = signal('');
  protected readonly idText = signal('');
  private debounce: ReturnType<typeof setTimeout> | undefined;

  protected readonly query = computed(() => ({
    page: Number(this.page()) > 0 ? Number(this.page()) : 1,
    pageSize: 50,
    ...(this.entity()?.trim() ? { entity: this.entity()!.trim() } : {}),
    ...(this.entityId()?.trim() ? { entityId: this.entityId()!.trim() } : {}),
  }));
  protected readonly logs = resource({
    params: () => this.query(),
    loader: ({ params }) => this.api.listAudit(params),
  });

  constructor() {
    effect(() => {
      this.entityText.set(this.entity() ?? '');
      this.idText.set(this.entityId() ?? '');
    });
  }

  protected pretty(v: unknown) {
    return JSON.stringify(v, null, 2);
  }

  protected onType(key: 'entity' | 'entityId', value: string) {
    (key === 'entity' ? this.entityText : this.idText).set(value);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(
      () =>
        void this.router.navigate([], {
          queryParams: { [key]: value.trim() || null, page: null },
          queryParamsHandling: 'merge',
        }),
      300,
    );
  }

  protected goTo(page: number) {
    void this.router.navigate([], {
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }
}
