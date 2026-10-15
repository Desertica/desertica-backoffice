import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { TPipe } from '../core/i18n/t.pipe';

/** Prev/next pager over the contract's `{ page, pageSize, total }` meta. */
@Component({
  selector: 'app-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports, TPipe],
  template: `
    @if (total() > 0) {
      <nav class="flex items-center justify-between gap-2 text-sm" aria-label="pagination">
        <span class="text-muted-foreground">
          {{ 'pager.summary' | t: { from: from(), to: to(), total: total() } }}
        </span>
        <div class="flex gap-2">
          <button
            hlmBtn
            variant="outline"
            size="sm"
            [disabled]="page() <= 1"
            (click)="pageChange.emit(page() - 1)"
          >
            {{ 'pager.prev' | t }}
          </button>
          <button
            hlmBtn
            variant="outline"
            size="sm"
            [disabled]="to() >= total()"
            (click)="pageChange.emit(page() + 1)"
          >
            {{ 'pager.next' | t }}
          </button>
        </div>
      </nav>
    }
  `,
})
export class Pager {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly total = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  protected readonly to = computed(() => Math.min(this.page() * this.pageSize(), this.total()));
}
