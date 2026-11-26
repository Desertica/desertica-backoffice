import { ChangeDetectionStrategy, Component, inject, resource, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { TourCatalog } from '../../core/api/tour-catalog';
import { HasPermissionDirective } from '../../core/auth/has-permission.directive';
import { EnumLabelPipe, TPipe } from '../../core/i18n/t.pipe';
import { LimaDateTimePipe } from '../../shared/format.pipes';
import { Notify } from '../../shared/notify';
import { ToursApi } from './tours.api';

@Component({
  selector: 'app-tours-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    TPipe,
    EnumLabelPipe,
    LimaDateTimePipe,
    HasPermissionDirective,
    HlmButtonImports,
    HlmSkeletonImports,
    HlmTableImports,
  ],
  templateUrl: './tours-page.html',
})
export class ToursPage {
  private readonly api = inject(ToursApi);
  private readonly catalog = inject(TourCatalog);
  private readonly notify = inject(Notify);

  /** Through the shared catalog, so the tour selectors of other screens see the same fresh list. */
  protected readonly tours = resource({ loader: () => this.catalog.reload() });
  protected readonly syncing = signal(false);

  protected async sync() {
    this.syncing.set(true);
    try {
      this.notify.success('tours.synced', await this.api.sync());
      this.tours.reload();
    } catch (e) {
      this.notify.error(e);
    } finally {
      this.syncing.set(false);
    }
  }
}
