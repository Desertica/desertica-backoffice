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
import { TPipe } from '../../core/i18n/t.pipe';
import { Pager } from '../../shared/pager';
import { CustomersApi } from './customers.api';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-customers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    TPipe,
    Pager,
    HlmButtonImports,
    HlmInputImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  template: `
    <div class="space-y-4">
      <h1 class="text-2xl font-semibold">{{ 'customers.title' | t }}</h1>
      <label class="grid max-w-md gap-1 text-sm">
        <span class="text-muted-foreground">{{ 'common.search' | t }}</span>
        <input
          hlmInput
          type="search"
          [placeholder]="'customers.search' | t"
          [ngModel]="search()"
          (ngModelChange)="onSearch($event)"
        />
      </label>

      @if (customers.error()) {
        <div
          class="flex items-center gap-3 rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
          role="alert"
        >
          {{ 'customers.loadError' | t }}
          <button hlmBtn size="sm" variant="outline" (click)="customers.reload()">
            {{ 'common.retry' | t }}
          </button>
        </div>
      } @else if (customers.isLoading() && !customers.hasValue()) {
        <hlm-skeleton class="h-72" />
      } @else if (customers.value(); as res) {
        @if (res.data.length === 0) {
          <p class="text-muted-foreground">{{ 'common.empty' | t }}</p>
        } @else {
          <div hlmTableContainer>
            <table hlmTable>
              <thead hlmTHead>
                <tr hlmTr>
                  <th hlmTh>{{ 'customers.col.name' | t }}</th>
                  <th hlmTh>{{ 'customers.col.email' | t }}</th>
                  <th hlmTh>{{ 'customers.col.phone' | t }}</th>
                  <th hlmTh>{{ 'customers.col.country' | t }}</th>
                </tr>
              </thead>
              <tbody hlmTBody>
                @for (c of res.data; track c.id) {
                  <tr hlmTr>
                    <td hlmTd>
                      <a [routerLink]="['/customers', c.id]" class="font-medium hover:underline"
                        >{{ c.firstName }} {{ c.lastName }}</a
                      >
                    </td>
                    <td hlmTd>{{ c.email }}</td>
                    <td hlmTd>{{ c.phone || '—' }}</td>
                    <td hlmTd>{{ c.country || '—' }}</td>
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
export class CustomersPage {
  readonly q = input<string>();
  readonly page = input<string>();

  private readonly api = inject(CustomersApi);
  private readonly router = inject(Router);
  protected readonly search = signal('');
  private debounce: ReturnType<typeof setTimeout> | undefined;

  protected readonly query = computed(() => ({
    page: Number(this.page()) > 0 ? Number(this.page()) : 1,
    pageSize: PAGE_SIZE,
    ...(this.q()?.trim() ? { q: this.q()!.trim() } : {}),
  }));
  protected readonly customers = resource({
    params: () => this.query(),
    loader: ({ params }) => this.api.list(params),
  });

  constructor() {
    effect(() => this.search.set(this.q() ?? ''));
  }

  protected onSearch(value: string) {
    this.search.set(value);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(
      () =>
        void this.router.navigate([], {
          queryParams: { q: value.trim() || null, page: null },
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
